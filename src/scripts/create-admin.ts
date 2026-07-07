import { supabase } from "@/integrations/supabase/client";

// This script should be run once to create the admin user
async function createAdmin() {
  try {
    console.log("Creating admin user...");

    const { data, error } = await supabase.functions.invoke("create-admin", {
      body: {
        email: "ielcomnunsahui@gmail.co",
        password: "IELCOM@2025",
        username: "admin",
      },
    });

    if (error) {
      console.error("Error creating admin:", error);
      return;
    }

    console.log("Admin user created successfully:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Call this function manually in the browser console or create a temporary page to execute it
// Example: import this file and call createAdmin() once
export { createAdmin };