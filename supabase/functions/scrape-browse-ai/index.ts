import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrowseAITask {
  id: string;
  status: string;
  capturedData?: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskType } = await req.json();
    
    const browseAiApiKey = Deno.env.get("BROWSE_AI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!browseAiApiKey) {
      console.error("BROWSE_AI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Browse AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Robot IDs for different data sources
    const ROBOTS = {
      flights: "FLIGHT_ROBOT_ID", // Replace with actual Browse AI robot ID for flights
      weather: "WEATHER_ROBOT_ID", // Replace with actual Browse AI robot ID for weather
      astronomy: "ASTRONOMY_ROBOT_ID", // Replace with actual Browse AI robot ID for astronomy
    };

    const robotId = ROBOTS[taskType as keyof typeof ROBOTS];
    
    if (!robotId || robotId.includes("ROBOT_ID")) {
      // Fallback to direct scraping if no robot configured
      console.log("No Browse AI robot configured, using direct scraping");
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback: true,
          message: "Browse AI robot not configured, use direct scraping" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start a new task
    console.log(`Starting Browse AI task for ${taskType}...`);
    
    const taskResponse = await fetch(`https://api.browse.ai/v2/robots/${robotId}/tasks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${browseAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Input variables can be customized per robot
      }),
    });

    if (!taskResponse.ok) {
      const errorData = await taskResponse.text();
      console.error("Browse AI task creation failed:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to create Browse AI task", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskData = await taskResponse.json();
    const taskId = taskData.result?.id;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "No task ID returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Browse AI task created: ${taskId}`);

    // Poll for task completion (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    let result: BrowseAITask | null = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://api.browse.ai/v2/robots/${robotId}/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${browseAiApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      result = statusData.result;

      if (result?.status === "successful") {
        console.log("Browse AI task completed successfully");
        break;
      } else if (result?.status === "failed") {
        console.error("Browse AI task failed");
        return new Response(
          JSON.stringify({ error: "Browse AI task failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      attempts++;
    }

    if (!result || result.status !== "successful") {
      return new Response(
        JSON.stringify({ error: "Browse AI task timed out" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result.capturedData,
        taskId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Browse AI scrape error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
