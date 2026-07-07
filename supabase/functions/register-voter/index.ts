import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { matric, name, email } = await req.json();

    // Basic input validation
    if (
      typeof matric !== "string" ||
      !/^\d{2}\/\d{2}[a-z]{3}\d{3}$/i.test(matric.trim()) ||
      typeof email !== "string" ||
      !/.+@.+\..+/.test(email.trim()) ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const normalizedMatric = matric.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Verify matric exists in roster
    const { data: roster, error: rosterError } = await supabaseAdmin
      .from("student_roster")
      .select("name")
      .ilike("matric", normalizedMatric)
      .maybeSingle();

    if (rosterError) throw rosterError;
    if (!roster) {
      return new Response(
        JSON.stringify({ error: "Matric not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if voter already registered
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("voters")
      .select("id")
      .eq("matric", normalizedMatric)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return new Response(
        JSON.stringify({ voterId: existing.id, status: "exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Insert new voter
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("voters")
      .insert({
        matric: normalizedMatric,
        name: name.trim() || roster.name,
        email: normalizedEmail,
        verified: false,
        voted: false,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ voterId: inserted.id, status: "created" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("register-voter error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});