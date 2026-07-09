import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { matric } = await req.json();
    const m = String(matric ?? "").trim().toLowerCase();
    if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/.test(m)) {
      return json({ error: "Invalid matric format. Example: 21/08nus014" }, 400);
    }

    const { data: roster, error } = await admin
      .from("student_roster")
      .select("name, matric, level")
      .ilike("matric", m)
      .maybeSingle();
    if (error) throw error;
    if (!roster) {
      return json({ error: "This matric number is not on the eligible voter list. Contact the electoral committee." }, 404);
    }

    // Check whether this matric already has a verified voter account
    const { data: voter } = await admin
      .from("voters")
      .select("verified")
      .eq("matric", m)
      .maybeSingle();

    return json({
      matric: roster.matric,
      name: roster.name,
      level: roster.level ?? null,
      alreadyRegistered: !!voter?.verified,
    }, 200);
  } catch (err: any) {
    console.error("check-matric error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}
