import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

const VotersLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const v = schema.parse({ email, password });
      setIsLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (authErr || !authData.user) {
        throw new Error(authErr?.message || "Invalid email or password");
      }

      // Confirm voter is verified
      const { data: voter, error: voterErr } = await supabase
        .from("voters")
        .select("id, email, verified, voted")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (voterErr) throw voterErr;
      if (!voter) {
        await supabase.auth.signOut();
        throw new Error("No voter record for this account. Please register first.");
      }
      if (!voter.verified) {
        await supabase.auth.signOut();
        throw new Error("Your registration is not verified. Complete the OTP step first.");
      }

      localStorage.setItem(
        "voterSession",
        JSON.stringify({ voterId: voter.id, email: voter.email, authenticatedAt: Date.now() })
      );

      toast({ title: "Login successful", description: "Redirecting to voting..." });
      setTimeout(() => navigate("/vote"), 700);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({
          title: "Login failed",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 px-4 pb-12">
        <div className="container mx-auto max-w-md">
          <Card className="p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-primary rounded-full shadow-glow mb-4">
                <LogIn className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">Voter Login</h1>
              <p className="text-muted-foreground">
                Log in with the email and password you registered with.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={72}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In to Vote"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Not registered yet?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/register")}>
                Register here
              </Button>
            </div>

            <div className="mt-8 p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your credentials are protected. Do not share your password with anyone.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VotersLogin;
