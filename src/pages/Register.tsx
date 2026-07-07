import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, PartyPopper } from "lucide-react";
import { z } from "zod";
import confetti from "canvas-confetti";

const registrationSchema = z.object({
  name: z.string().trim().min(3, "Enter your full name").max(120),
  matric: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^\d{2}\/\d{2}[a-z]{3}\d{3}$/, "Invalid matric format (e.g., 21/08nus014)"),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

type Step = "register" | "otp" | "success";

const Register = () => {
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [voterId, setVoterId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("register");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fire graffiti/confetti on success
  useEffect(() => {
    if (step !== "success") return;
    const duration = 4000;
    const end = Date.now() + duration;
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 65, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 65, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 }, colors });
  }, [step]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const v = registrationSchema.parse({ name, matric, email, password });
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke("register-voter", {
        body: v,
      });

      if (error) {
        // Try to extract the underlying error message
        const ctx: any = (error as any).context;
        let msg = error.message;
        try {
          if (ctx?.text) {
            const txt = await ctx.text();
            const parsed = JSON.parse(txt);
            if (parsed?.error) msg = parsed.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (!data?.voterId) throw new Error(data?.error || "Registration failed");

      setVoterId(data.voterId);

      // Send OTP
      const { error: otpErr } = await supabase.functions.invoke("send-otp", {
        body: { voterId: data.voterId, email: v.email },
      });
      if (otpErr) throw otpErr;

      toast({
        title: "Verification code sent",
        description: `Check your inbox at ${v.email}.`,
      });
      setStep("otp");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({
          title: "Registration failed",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { voterId, otpCode: otp },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Invalid OTP");
      setStep("success");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error?.message || "Invalid or expired code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke("send-otp", {
        body: { voterId, email },
      });
      if (error) throw error;
      toast({ title: "OTP resent", description: `Sent to ${email}` });
    } catch (error: any) {
      toast({ title: "Could not resend", description: error?.message, variant: "destructive" });
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
                {step === "success" ? (
                  <PartyPopper className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <Shield className="w-8 h-8 text-primary-foreground" />
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                {step === "register" && "Voter Registration"}
                {step === "otp" && "Verify Your Email"}
                {step === "success" && "Congratulations! 🎉"}
              </h1>
              <p className="text-muted-foreground">
                {step === "register" && "Register to participate in the 2026/2027 NUNSA Election"}
                {step === "otp" && `Enter the 6-digit code sent to ${email}`}
                {step === "success" && "You've registered as a voter for the 2026/2027 NUNSA Election."}
              </p>
            </div>

            {step === "register" && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Awwal Abubakar Sadik"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matric">Matric Number</Label>
                  <Input
                    id="matric"
                    type="text"
                    placeholder="21/08nus014"
                    value={matric}
                    onChange={(e) => setMatric(e.target.value)}
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the admin-uploaded eligible voter list.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
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
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={72}
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll use this password to log in on election day.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register to Vote"
                  )}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    maxLength={6}
                    className="text-2xl text-center tracking-[0.5em]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Complete"
                  )}
                </Button>

                <div className="flex justify-between text-sm">
                  <Button variant="link" className="p-0 h-auto" onClick={handleResendOTP} type="button" disabled={isLoading}>
                    Resend Code
                  </Button>
                  <Button variant="link" className="p-0 h-auto" onClick={() => setStep("register")} type="button">
                    Change email
                  </Button>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="text-center space-y-6 py-4">
                <div className="text-6xl">🎊🎉🎊</div>
                <p className="text-foreground">
                  Your account is verified. Come back on election day and log in with your
                  <strong> email</strong> and <strong>password</strong> to cast your vote.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="w-full bg-gradient-primary hover:shadow-glow"
                >
                  Go to Home
                </Button>
              </div>
            )}

            <div className="mt-8 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-foreground">Security Notice</h4>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>Your data is securely stored and used only for election purposes.</li>
                <li>Your matric number is verified against the admin-approved eligible voter list.</li>
                <li>Only eligible students that paid the Association fee can register to vote.</li>
                <li>Do not share your password or verification code with anyone.</li>
              </ul>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Register;
