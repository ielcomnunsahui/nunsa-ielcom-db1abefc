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

    const { userId, role, userData } = await req.json();

    // Basic input validation
    if (
      typeof userId !== "string" ||
      typeof role !== "string" ||
      !["voter", "aspirant", "admin"].includes(role)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get user data from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    let result;

    // Assign role based on type
    switch (role) {
      case "voter":
        // Check if already exists
        const { data: existingVoter } = await supabaseAdmin
          .from("voters")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingVoter) {
          const { data: voterData, error: voterError } = await supabaseAdmin
            .from("voters")
            .insert({
              user_id: userId,
              matric: userData?.matric || "",
              name: userData?.name || authUser.user.email?.split("@")[0] || "Unknown",
              email: authUser.user.email || "",
              verified: true,
              voted: false,
            })
            .select("id")
            .single();

          if (voterError) throw voterError;
          result = { role: "voter", id: voterData.id };
        } else {
          result = { role: "voter", id: existingVoter.id, status: "exists" };
        }
        break;

      case "aspirant":
        // Check if already exists
        const { data: existingAspirant } = await supabaseAdmin
          .from("aspirants")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingAspirant) {
          // For aspirants, we create a basic entry - they'll complete their profile later
          const { data: aspirantData, error: aspirantError } = await supabaseAdmin
            .from("aspirants")
            .insert({
              user_id: userId,
              full_name: userData?.name || authUser.user.email?.split("@")[0] || "Unknown",
              email: authUser.user.email || "",
              matric: userData?.matric || "",
              department: userData?.department || "",
              level: userData?.level || "",
              date_of_birth: userData?.date_of_birth || "2000-01-01",
              gender: userData?.gender || "",
              phone: userData?.phone || "",
              position_id: userData?.position_id || null,
              why_running: userData?.why_running || "",
              cgpa: userData?.cgpa || 0.0,
              leadership_history: userData?.leadership_history || "",
              status: "draft", // Allow them to complete profile later
            })
            .select("id")
            .single();

          if (aspirantError) throw aspirantError;
          result = { role: "aspirant", id: aspirantData.id };
        } else {
          result = { role: "aspirant", id: existingAspirant.id, status: "exists" };
        }
        break;

      case "admin":
        // Check if already exists
        const { data: existingAdmin } = await supabaseAdmin
          .from("admin_users")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingAdmin) {
          const { data: adminData, error: adminError } = await supabaseAdmin
            .from("admin_users")
            .insert({
              user_id: userId,
              username: userData?.username || authUser.user.email?.split("@")[0] || "admin",
              email: authUser.user.email || "",
            })
            .select("id")
            .single();

          if (adminError) throw adminError;
          result = { role: "admin", id: adminData.id };
        } else {
          result = { role: "admin", id: existingAdmin.id, status: "exists" };
        }
        break;

      default:
        throw new Error("Invalid role");
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("assign-user-role error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});