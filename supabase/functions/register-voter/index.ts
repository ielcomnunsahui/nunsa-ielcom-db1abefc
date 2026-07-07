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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const matric = String(body.matric ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/i.test(matric)) {
      return new Response(JSON.stringify({ error: "Invalid matric format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    if (!/.+@.+\..+/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    if (!name) {
      return new Response(JSON.stringify({ error: "Full name required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // Verify matric exists in admin-uploaded student roster
    const { data: roster, error: rosterErr } = await supabaseAdmin
      .from("student_roster")
      .select("name, matric")
      .ilike("matric", matric)
      .maybeSingle();

    if (rosterErr) throw rosterErr;
    if (!roster) {
      return new Response(JSON.stringify({ error: "Matric number not found in the eligible voter list. Contact the electoral committee." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });
    }

    // Check existing voter
    const { data: existing } = await supabaseAdmin
      .from("voters")
      .select("id, verified, auth_user_id, email")
      .eq("matric", matric)
      .maybeSingle();

    if (existing) {
      if (existing.verified) {
        return new Response(JSON.stringify({ error: "This matric number is already registered. Please log in instead." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 });
      }
      // Partial registration - resend OTP for their existing email
      return new Response(JSON.stringify({ voterId: existing.id, email: existing.email, status: "pending_verification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Create Supabase Auth user (email+password)
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // OTP-in-app; we don't need email link confirmation
      user_metadata: { full_name: name, matric },
    });
    if (authErr || !authUser?.user) {
      const msg = authErr?.message?.includes("already") ? "This email is already in use." : (authErr?.message || "Could not create account");
      return new Response(JSON.stringify({ error: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // Insert voter row
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("voters")
      .insert({
        matric,
        name,
        email,
        verified: false,
        voted: false,
        auth_user_id: authUser.user.id,
      })
      .select("id")
      .single();

    if (insErr) {
      // Clean up auth user on failure
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      throw insErr;
    }

    return new Response(JSON.stringify({ voterId: inserted.id, email, status: "created" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error: any) {
    console.error("register-voter error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
