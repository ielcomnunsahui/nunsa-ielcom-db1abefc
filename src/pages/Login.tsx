import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import MatricLoginForm from "@/components/MatricLoginForm";
import RegistrationFlow from "@/components/RegistrationFlow";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isLoading: authLoading } = useAuth();
  const returnTo = (location.state as any)?.returnTo || "/vote";

  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "admin") navigate("/admin");
      else navigate(returnTo);
    }
  }, [user, role, authLoading, navigate, returnTo]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 px-4 pb-12">
        <div className="container mx-auto max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-primary rounded-full shadow-glow mb-4">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Voter Login
            </h1>
            <p className="text-lg text-muted-foreground">
              Log in with your matric number and password to cast your vote
            </p>
          </div>

          <Card className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <MatricLoginForm loginLabel="Log In to Vote" onSuccess={() => navigate(returnTo)} />
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <RegistrationFlow successMessage="You've registered! Switch to the Login tab and sign in with your matric number." />
              </TabsContent>
            </Tabs>
          </Card>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Aspirant? <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/aspirant-login")}>Aspirant Login</Button>
            </p>
            <p className="text-sm text-muted-foreground">
              Administrator? <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/admin-login")}>Admin Login</Button>
            </p>
          </div>

          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Secure Voter Access</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Log in with your matric number and password</li>
              <li>• Forgot your password? Reset it with an email OTP</li>
              <li>• Cast your vote securely and anonymously</li>
              <li>• Only registered and verified voters can access voting</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;