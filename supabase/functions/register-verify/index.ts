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
    const { registrationId, otpCode } = await req.json();
    if (!registrationId || !otpCode) return json({ error: "registrationId and otpCode required" }, 400);
    const code = String(otpCode).trim();

    const { data: reg, error } = await admin
      .from("registration_otp")
      .select("*")
      .eq("id", registrationId)
      .maybeSingle();
    if (error) throw error;
    if (!reg) return json({ error: "Registration session not found. Start again." }, 404);
    if (reg.verified) return json({ success: true }, 200);

    if (new Date(reg.expires_at).getTime() < Date.now()) {
      return json({ error: "Code expired. Please request a new one." }, 400);
    }
    if ((reg.attempts ?? 0) >= 6) {
      return json({ error: "Too many attempts. Please request a new code." }, 429);
    }
    if (reg.otp_code !== code) {
      await admin.from("registration_otp").update({ attempts: (reg.attempts ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", registrationId);
      return json({ error: "Invalid code. Please try again." }, 400);
    }

    await admin.from("registration_otp").update({ verified: true, updated_at: new Date().toISOString() }).eq("id", registrationId);
    return json({ success: true }, 200);
  } catch (err: any) {
    console.error("register-verify error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}
