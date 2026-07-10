import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import RegistrationFlow from "@/components/RegistrationFlow";
import MatricLoginForm from "@/components/MatricLoginForm";

const AspirantLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo || "/aspirant";

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) navigate(returnTo);
    };
    checkUser();
  }, [navigate, returnTo]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 px-4 pb-12">
        <div className="container mx-auto max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-secondary rounded-full shadow-glow mb-4">
              <Trophy className="w-8 h-8 text-secondary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Aspirant Portal
            </h1>
            <p className="text-lg text-muted-foreground">
              Log in with your matric number and password to manage your application
            </p>
          </div>

          <Card className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <MatricLoginForm variant="secondary" loginLabel="Access Dashboard" onSuccess={() => navigate(returnTo)} />
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <div className="p-3 bg-muted/30 rounded-lg mb-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>One account for voting & aspiring.</strong> Complete registration here — the same email and password will log you in to the aspirant portal.
                  </p>
                </div>
                <RegistrationFlow successMessage="You've registered! Log in on the Login tab to apply as an aspirant." />
              </TabsContent>
            </Tabs>
          </Card>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you a voter? <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/voters-login")}>
                Vote here instead
              </Button>
            </p>
            <p className="text-sm text-muted-foreground">
              Administrator? <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/admin-login")}>
                Admin login
              </Button>
            </p>
          </div>

          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Aspirant Portal Features</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Submit and track your leadership position applications</li>
              <li>• Monitor application status and screening progress</li>
              <li>• Access position requirements and deadlines</li>
              <li>• Receive updates on your candidacy journey</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AspirantLogin;