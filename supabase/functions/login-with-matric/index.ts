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
      return json({ error: "Invalid matric format (e.g. 21/08nus014)" }, 400);
    }

    const { data: voter, error } = await admin
      .from("voters")
      .select("email, verified")
      .eq("matric", m)
      .maybeSingle();
    if (error) throw error;
    if (!voter) return json({ error: "No account found for this matric number. Please register first." }, 404);
    if (!voter.verified) return json({ error: "Your registration is not verified. Complete the OTP step first." }, 403);

    return json({ email: voter.email }, 200);
  } catch (err: any) {
    console.error("login-with-matric error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}