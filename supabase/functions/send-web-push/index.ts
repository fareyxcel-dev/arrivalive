import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, flightId, data } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's push subscription from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("push_subscription")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.push_subscription) {
      console.log("No push subscription found for user:", userId);
      return new Response(
        JSON.stringify({ sent: false, reason: "No subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscription: PushSubscription = profile.push_subscription;

    // Build push notification payload
    const payload = JSON.stringify({
      title: title || "Arriva.MV",
      body: body || "Flight status update",
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: {
        flightId,
        url: "/",
        ...data,
      },
    });

    console.log(`Sending push to ${subscription.endpoint}`);

    // Use Web Push API
    // Note: For production, use a proper web-push library
    // This is a simplified implementation
    const pushResponse = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        // Add VAPID authorization headers here
        // This requires proper JWT signing with VAPID keys
      },
      body: payload,
    });

    if (!pushResponse.ok) {
      console.error("Push failed:", pushResponse.status);
      
      // If subscription expired, remove it
      if (pushResponse.status === 410) {
        await supabase
          .from("profiles")
          .update({ push_subscription: null })
          .eq("user_id", userId);
      }
      
      return new Response(
        JSON.stringify({ sent: false, status: pushResponse.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Push sent successfully to user:", userId);

    return new Response(
      JSON.stringify({ sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send web push error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
