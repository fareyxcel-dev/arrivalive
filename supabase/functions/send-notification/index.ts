import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  subscription: {
    id: string;
    user_id: string;
    flight_id: string;
    notify_sms: boolean;
    notify_email: boolean;
    notify_push: boolean;
    profiles: {
      phone?: string;
      notification_email?: string;
      fcm_token?: string;
      onesignal_player_id?: string;
    };
  };
  flight: {
    flight_id: string;
    origin: string;
    scheduled_time: string;
    status: string;
    flight_date: string;
  };
  message: string;
  oldStatus: string;
  newStatus: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, flight, message, oldStatus, newStatus }: NotificationRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
      push: { sent: false, error: null as string | null },
    };

    console.log(`Processing notification for flight ${flight.flight_id}: ${oldStatus} → ${newStatus}`);

    // Send SMS via Twilio
    if (subscription.notify_sms && subscription.profiles?.phone) {
      try {
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: subscription.profiles.phone,
                From: twilioPhoneNumber,
                Body: message,
              }),
            }
          );

          if (response.ok) {
            results.sms.sent = true;
            console.log("SMS sent successfully");
          } else {
            const error = await response.text();
            results.sms.error = error;
            console.error("Twilio error:", error);
          }
        } else {
          results.sms.error = "Twilio credentials not configured";
        }
      } catch (error: unknown) {
        results.sms.error = error instanceof Error ? error.message : String(error);
        console.error("SMS error:", error);
      }
    }

    // Send Email via Resend
    if (subscription.notify_email && subscription.profiles?.notification_email) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        if (resendApiKey) {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ARRIVA.MV <notifications@resend.dev>",
              to: [subscription.profiles.notification_email],
              subject: `Flight ${flight.flight_id} Status Update`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #0ea5e9;">ARRIVA.MV Flight Alert</h1>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
                    <h2>Flight ${flight.flight_id}</h2>
                    <p><strong>From:</strong> ${flight.origin}</p>
                    <p><strong>Scheduled:</strong> ${flight.scheduled_time}</p>
                    <p><strong>Status Change:</strong> ${oldStatus} → <span style="color: ${getStatusColor(newStatus)}; font-weight: bold;">${newStatus}</span></p>
                  </div>
                  <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                    You received this because you subscribed to flight notifications on ARRIVA.MV
                  </p>
                </div>
              `,
            }),
          });

          if (response.ok) {
            results.email.sent = true;
            console.log("Email sent successfully");
          } else {
            const error = await response.text();
            results.email.error = error;
            console.error("Resend error:", error);
          }
        } else {
          results.email.error = "Resend API key not configured";
        }
      } catch (error: unknown) {
        results.email.error = error instanceof Error ? error.message : String(error);
        console.error("Email error:", error);
      }
    }

    // Send Push Notification — fire ALL configured channels in parallel
    const pushChannels: Record<string, { sent: boolean; error: string | null }> = {
      pushalert: { sent: false, error: null },
      onesignal: { sent: false, error: null },
      fcm: { sent: false, error: null },
      webpush: { sent: false, error: null },
    };

    if (subscription.notify_push) {
      const tasks: Promise<void>[] = [];

      // PushAlert
      if (subscription.profiles?.onesignal_player_id) {
        tasks.push((async () => {
          try {
            const pushAlertApiKey = "0b59464902eedaad9877c595ad33f2fa";
            const r = await fetch("https://api.pushalert.co/rest/v1/send/id", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `api_key=${pushAlertApiKey}`,
              },
              body: JSON.stringify({
                title: `Flight ${flight.flight_id} Update`,
                message,
                url: "/",
                subscriber: subscription.profiles.onesignal_player_id,
              }),
            });
            if (r.ok) {
              pushChannels.pushalert.sent = true;
              console.log("PushAlert sent");
            } else {
              pushChannels.pushalert.error = await r.text();
            }
          } catch (e) {
            pushChannels.pushalert.error = e instanceof Error ? e.message : String(e);
          }
        })());
      }

      // OneSignal
      if (subscription.profiles?.onesignal_player_id) {
        const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
        const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
        if (oneSignalAppId && oneSignalRestApiKey) {
          tasks.push((async () => {
            try {
              const r = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Basic ${oneSignalRestApiKey}`,
                },
                body: JSON.stringify({
                  app_id: oneSignalAppId,
                  include_player_ids: [subscription.profiles.onesignal_player_id],
                  headings: { en: `Flight ${flight.flight_id} Update` },
                  contents: { en: message },
                  data: { flightId: flight.flight_id, flightDate: flight.flight_date, status: newStatus, url: "/" },
                  priority: 10,
                  ttl: 86400,
                }),
              });
              const result = await r.json();
              if (r.ok) {
                pushChannels.onesignal.sent = true;
                console.log("OneSignal sent:", result.id);
              } else {
                pushChannels.onesignal.error = JSON.stringify(result);
              }
            } catch (e) {
              pushChannels.onesignal.error = e instanceof Error ? e.message : String(e);
            }
          })());
        }
      }

      // FCM
      if (subscription.profiles?.fcm_token) {
        const firebaseApiKey = Deno.env.get("FIREBASE_API_KEY");
        if (firebaseApiKey) {
          tasks.push((async () => {
            try {
              const r = await fetch("https://fcm.googleapis.com/fcm/send", {
                method: "POST",
                headers: {
                  Authorization: `key=${firebaseApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  to: subscription.profiles.fcm_token,
                  notification: {
                    title: `Flight ${flight.flight_id} Update`,
                    body: message,
                    icon: "/icon-512.png",
                  },
                  data: { flight_id: flight.flight_id, status: newStatus },
                }),
              });
              if (r.ok) {
                pushChannels.fcm.sent = true;
                console.log("FCM sent");
              } else {
                pushChannels.fcm.error = await r.text();
              }
            } catch (e) {
              pushChannels.fcm.error = e instanceof Error ? e.message : String(e);
            }
          })());
        }
      }

      // Web Push (VAPID) via existing send-web-push function
      if ((subscription.profiles as any)?.push_subscription) {
        tasks.push((async () => {
          try {
            const { data, error } = await supabase.functions.invoke("send-web-push", {
              body: {
                subscription: (subscription.profiles as any).push_subscription,
                title: `Flight ${flight.flight_id} Update`,
                body: message,
                data: { flightId: flight.flight_id, status: newStatus, url: "/" },
              },
            });
            if (!error) {
              pushChannels.webpush.sent = true;
              console.log("WebPush sent");
            } else {
              pushChannels.webpush.error = error.message || JSON.stringify(error);
            }
          } catch (e) {
            pushChannels.webpush.error = e instanceof Error ? e.message : String(e);
          }
        })());
      }

      await Promise.allSettled(tasks);

      const anySent = Object.values(pushChannels).some(c => c.sent);
      results.push.sent = anySent;
      if (!anySent) {
        const errs = Object.entries(pushChannels)
          .filter(([, v]) => v.error)
          .map(([k, v]) => `${k}:${v.error}`)
          .join(" | ");
        results.push.error = errs || "no channels available";
      }
    }

    // Log notifications
    const logsToInsert = [];
    if (subscription.notify_sms) {
      logsToInsert.push({
        subscription_id: subscription.id,
        notification_type: "sms",
        status_change: `${oldStatus} → ${newStatus}`,
        success: results.sms.sent,
        error_message: results.sms.error,
      });
    }
    if (subscription.notify_email) {
      logsToInsert.push({
        subscription_id: subscription.id,
        notification_type: "email",
        status_change: `${oldStatus} → ${newStatus}`,
        success: results.email.sent,
        error_message: results.email.error,
      });
    }
    if (subscription.notify_push) {
      // One log row per push channel attempted
      for (const [channel, info] of Object.entries(pushChannels)) {
        if (info.sent || info.error) {
          logsToInsert.push({
            subscription_id: subscription.id,
            notification_type: `push:${channel}`,
            status_change: `${oldStatus} → ${newStatus}`,
            success: info.sent,
            error_message: info.error,
          });
        }
      }
      logsToInsert.push({
        subscription_id: subscription.id,
        notification_type: "push",
        status_change: `${oldStatus} → ${newStatus}`,
        success: results.push.sent,
        error_message: results.push.error,
      });
    }

    if (logsToInsert.length > 0) {
      await supabase.from("notification_log").insert(logsToInsert);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Notification error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "LANDED":
      return "#15bd4d";
    case "DELAYED":
      return "#fca90f";
    case "CANCELLED":
      return "#fc0f37";
    default:
      return "#64748b";
  }
}