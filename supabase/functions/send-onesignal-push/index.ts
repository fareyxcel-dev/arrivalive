import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, flightId, flightDate, title, body, data } = await req.json();
    
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.error("OneSignal credentials not configured");
      return new Response(
        JSON.stringify({ error: "OneSignal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's OneSignal player ID from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onesignal_player_id, fcm_token")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.onesignal_player_id) {
      console.log("No OneSignal player ID found for user:", userId);
      return new Response(
        JSON.stringify({ sent: false, reason: "No player ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notification via OneSignal REST API
    const notificationPayload = {
      app_id: oneSignalAppId,
      include_player_ids: [profile.onesignal_player_id],
      headings: { en: title || "Arriva.MV" },
      contents: { en: body || "Flight status update" },
      data: {
        flightId,
        flightDate,
        url: "/",
        ...data,
      },
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
      android_channel_id: "flight-notifications",
      priority: 10,
      ttl: 86400,
    };

    console.log(`Sending OneSignal push to player: ${profile.onesignal_player_id}`);

    const pushResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${oneSignalRestApiKey}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const pushResult = await pushResponse.json();

    if (!pushResponse.ok) {
      console.error("OneSignal push failed:", pushResult);
      return new Response(
        JSON.stringify({ sent: false, error: pushResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("OneSignal push sent successfully:", pushResult.id);

    // Log the notification
    await supabase.from("notification_log").insert({
      subscription_id: flightId,
      notification_type: "push",
      status_change: `${title}: ${body}`,
      success: true,
    });

    return new Response(
      JSON.stringify({ sent: true, notificationId: pushResult.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send OneSignal push error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
