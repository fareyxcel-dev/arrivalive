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
        "user_id, notification_email, phone, onesignal_player_id, notification_prefs",
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

    // PUSH (PushAlert / OneSignal via existing send-notification function)
    if (prefs.push && profile?.onesignal_player_id) {
      try {
        const r = await admin.functions.invoke("send-notification", {
          body: {
            user_ids: [userId],
            title,
            message: body,
            url: "/",
            test: true,
          },
        });
        results.push = r.data ?? r.error?.message ?? "ok";
      } catch (e) {
        results.push = `error: ${String(e)}`;
      }
    } else {
      results.push = "skipped";
    }

    // EMAIL via Resend
    if (prefs.email && profile?.notification_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ARRIVA.MV <onboarding@resend.dev>",
              to: [profile.notification_email],
              subject: title,
              text: body,
            }),
          });
          results.email = r.ok ? "sent" : `status ${r.status}`;
        } catch (e) {
          results.email = `error: ${String(e)}`;
        }
      } else results.email = "RESEND_API_KEY not set";
    } else results.email = "skipped";

    // SMS via Twilio
    if (prefs.sms && profile?.phone) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_PHONE_NUMBER");
      if (sid && tok && from) {
        try {
          const r = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${sid}:${tok}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: from,
                To: profile.phone,
                Body: body,
              }),
            },
          );
          results.sms = r.ok ? "sent" : `status ${r.status}`;
        } catch (e) {
          results.sms = `error: ${String(e)}`;
        }
      } else results.sms = "Twilio secrets missing";
    } else results.sms = "skipped";

    // Telegram (placeholder - no chat_id wiring yet)
    results.telegram = prefs.telegram ? "not configured" : "skipped";

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
