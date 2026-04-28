// Admin-only test notification sender. Fires a sample LANDED event to the
// caller's own subscriptions across whichever channels they've enabled in
// profiles.notification_prefs. Useful for verifying push delivery without
// waiting for a real flight event.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Validate caller JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Verify admin role
    const { data: hasAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load profile + prefs
    const { data: profile } = await admin
      .from("profiles")
      .select(
        "user_id, notification_email, phone, onesignal_player_id, fcm_token, push_subscription, notification_prefs",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const prefs = (profile?.notification_prefs as any) || {
      push: true,
      telegram: false,
      email: false,
      sms: false,
    };

    const title = "ARRIVA.MV — Test Notification";
    const body = "TEST EK 9999 from DXB has just LANDED at T1.";

    const results: Record<string, any> = {};
    const tasks: Promise<void>[] = [];

    // PUSH: fire PushAlert / OneSignal / FCM / WebPush in parallel
    if (prefs.push) {
      results.push = { pushalert: "skipped", onesignal: "skipped", fcm: "skipped", webpush: "skipped" };

      if (profile?.onesignal_player_id) {
        tasks.push((async () => {
          try {
            const r = await fetch("https://api.pushalert.co/rest/v1/send/id", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `api_key=0b59464902eedaad9877c595ad33f2fa` },
              body: JSON.stringify({ title, message: body, url: "/", subscriber: profile.onesignal_player_id }),
            });
            results.push.pushalert = r.ok ? "sent" : `status ${r.status}`;
          } catch (e) { results.push.pushalert = `error: ${String(e)}`; }
        })());

        const appId = Deno.env.get("ONESIGNAL_APP_ID");
        const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
        if (appId && restKey) {
          tasks.push((async () => {
            try {
              const r = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Basic ${restKey}` },
                body: JSON.stringify({
                  app_id: appId,
                  include_player_ids: [profile.onesignal_player_id],
                  headings: { en: title },
                  contents: { en: body },
                }),
              });
              results.push.onesignal = r.ok ? "sent" : `status ${r.status}`;
            } catch (e) { results.push.onesignal = `error: ${String(e)}`; }
          })());
        }
      }

      if (profile?.fcm_token) {
        const fcmKey = Deno.env.get("FIREBASE_API_KEY");
        if (fcmKey) {
          tasks.push((async () => {
            try {
              const r = await fetch("https://fcm.googleapis.com/fcm/send", {
                method: "POST",
                headers: { Authorization: `key=${fcmKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ to: profile.fcm_token, notification: { title, body } }),
              });
              results.push.fcm = r.ok ? "sent" : `status ${r.status}`;
            } catch (e) { results.push.fcm = `error: ${String(e)}`; }
          })());
        }
      }

      if ((profile as any)?.push_subscription) {
        tasks.push((async () => {
          try {
            const { error } = await admin.functions.invoke("send-web-push", {
              body: { subscription: (profile as any).push_subscription, title, body },
            });
            results.push.webpush = error ? `error: ${error.message || error}` : "sent";
          } catch (e) { results.push.webpush = `error: ${String(e)}`; }
        })());
      }
    } else {
      results.push = "skipped";
    }

    // EMAIL via Resend (in parallel)
    if (prefs.email && profile?.notification_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        tasks.push((async () => {
          try {
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "ARRIVA.MV <onboarding@resend.dev>",
                to: [profile.notification_email],
                subject: title,
                text: body,
              }),
            });
            results.email = r.ok ? "sent" : `status ${r.status}`;
          } catch (e) { results.email = `error: ${String(e)}`; }
        })());
      } else results.email = "RESEND_API_KEY not set";
    } else results.email = "skipped";

    // SMS via Twilio (in parallel)
    if (prefs.sms && profile?.phone) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_PHONE_NUMBER");
      if (sid && tok && from) {
        tasks.push((async () => {
          try {
            const r = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${btoa(`${sid}:${tok}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ From: from, To: profile.phone, Body: body }),
              },
            );
            results.sms = r.ok ? "sent" : `status ${r.status}`;
          } catch (e) { results.sms = `error: ${String(e)}`; }
        })());
      } else results.sms = "Twilio secrets missing";
    } else results.sms = "skipped";

    results.telegram = prefs.telegram ? "not configured" : "skipped";

    await Promise.allSettled(tasks);

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-test-notification error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
