import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, CheckCircle2 } from "lucide-react";

const SetupAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const createAdmin = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: "ielcomnunsahui@gmail.co",
          password: "IELCOM@2025",
          username: "admin",
        },
      });

      if (error) throw error;

      toast({
        title: "Admin Created!",
        description: "Admin account has been created successfully.",
      });

      setIsComplete(true);
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Setup</h1>
          <p className="text-muted-foreground">
            Initialize the admin account for NUNSA Voting System
          </p>
        </div>

        {!isComplete ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will create an admin account with the following credentials:
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li><strong>Email:</strong> ielcomnunsahui@gmail.co</li>
                <li><strong>Password:</strong> IELCOM@2025</li>
              </ul>
            </div>

            <Button
              onClick={createAdmin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                "Create Admin Account"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              ⚠️ This page should only be accessed once during initial setup
            </p>
          </div>
        ) : (
          <div className="text-center space-y-6 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
              <p className="text-muted-foreground mb-4">
                Admin account has been created successfully.
              </p>
              <Button
                onClick={() => window.location.href = "/admin-login"}
                className="w-full"
              >
                Go to Admin Login
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SetupAdmin;