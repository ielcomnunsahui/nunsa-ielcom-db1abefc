// Lookup voter by matric using service role (bypasses RLS safely)
// Returns a minimal payload: { voter: { id, email, verified, voted } | null }
// CORS enabled and JWT verification will be handled via config.toml

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matric } = await req.json();

    // Basic input validation (same as client)
    const trimmed = String(matric ?? "").trim().toLowerCase();
    const matricRegex = /^\d{2}\/\d{2}[a-z]{3}\d{3}$/;
    if (!matricRegex.test(trimmed)) {
      return new Response(
        JSON.stringify({ error: "Invalid matric format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing env for lookup-voter");
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: voter, error } = await supabase
      .from("voters")
      .select("id, email, verified, voted")
      .eq("matric", trimmed)
      .maybeSingle();

    if (error) {
      console.error("lookup-voter query error:", error);
      return new Response(
        JSON.stringify({ error: "Lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ voter: voter ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("lookup-voter exception:", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
