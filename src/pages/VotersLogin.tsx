import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { BiometricSetup } from "@/components/BiometricSetup";

const matricSchema = z.object({
  matric: z.string()
    .trim()
    .toLowerCase()
    .regex(/^\d{2}\/\d{2}[a-z]{3}\d{3}$/, "Invalid matric format (e.g., 21/08nus014)"),
});

const VotersLogin = () => {
  const [matric, setMatric] = useState("");
  const [step, setStep] = useState<"matric" | "auth" | "otp" | "complete-setup">("matric");
  const [voterId, setVoterId] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleMatricSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = matricSchema.parse({ matric });
      setIsLoading(true);

      // Check if voter exists and is verified
      const { data, error } = await supabase.functions.invoke("lookup-voter", {
        body: { matric: validated.matric },
      });

      if (error) throw error;
      const voterData = data?.voter;

      if (!voterData) {
        toast({
          title: "Not Registered",
          description: "This matric number is not registered. Please register first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if voter exists but is not verified (partially registered)
      if (!voterData.verified) {
        toast({
          title: "Complete Registration",
          description: "Please complete your biometric setup or OTP verification to finish registration.",
        });
        setVoterId(voterData.id);
        setEmail(voterData.email);
        setStep("complete-setup");
        setIsLoading(false);
        return;
      }

      setVoterId(voterData.id);
      setEmail(voterData.email);
      setStep("auth");

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Matric check error:", error);
        toast({
          title: "Error",
          description: "Failed to verify matric number. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setIsLoading(true);

      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        toast({
          title: "Not Supported",
          description: "Biometric authentication is not supported on this device. Using OTP instead.",
          variant: "destructive",
        });
        await handleOTPRequest();
        return;
      }

      // Get biometric credentials from database
      const { data: bioData, error: bioError } = await supabase
        .from("voter_biometric")
        .select("credential_id, public_key")
        .eq("voter_id", voterId)
        .maybeSingle();

      if (bioError || !bioData) {
        toast({
          title: "Biometric Not Set Up",
          description: "Biometric authentication not found. Using OTP instead.",
        });
        await handleOTPRequest();
        return;
      }

      // Perform WebAuthn authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: Uint8Array.from(atob(bioData.credential_id), c => c.charCodeAt(0)),
            type: "public-key",
          }],
          timeout: 60000,
        },
      });

      if (credential) {
        toast({
          title: "Authentication Successful",
          description: "Biometric verified. Redirecting to voting...",
        });
        // Persist lightweight voter session
        localStorage.setItem(
          "voterSession",
          JSON.stringify({ voterId, email, authenticatedAt: Date.now() })
        );
        setTimeout(() => navigate("/vote"), 1000);
      }

    } catch (error) {
      console.error("Biometric auth error:", error);
      toast({
        title: "Biometric Failed",
        description: "Authentication failed. Would you like to use OTP instead?",
        variant: "destructive",
      });
      setStep("otp");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPRequest = async () => {
    try {
      setIsLoading(true);
      setStep("otp");

      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { voterId, email },
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${email}`,
      });

    } catch (error) {
      console.error("OTP request error:", error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { voterId, otpCode },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Login Successful",
          description: "OTP verified. Redirecting to voting...",
        });
        // Persist lightweight voter session
        localStorage.setItem(
          "voterSession",
          JSON.stringify({ voterId, email, authenticatedAt: Date.now() })
        );
        setTimeout(() => navigate("/vote"), 1000);
      }

    } catch (error) {
      console.error("OTP verify error:", error);
      toast({
        title: "Verification Failed",
        description: "Invalid or expired OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    toast({
      title: "Registration Complete!",
      description: "Your account has been verified. You can now login when voting opens.",
    });
    setTimeout(() => navigate("/"), 2000); // Redirect to home after completing setup
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 px-4 pb-12">
        <div className="container mx-auto max-w-md">
          <Card className="p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-primary rounded-full shadow-glow mb-4">
                {step === "matric" ? (
                  <Fingerprint className="w-8 h-8 text-primary-foreground" />
                ) : step === "auth" ? (
                  <Fingerprint className="w-8 h-8 text-primary-foreground" />
                ) : step === "complete-setup" ? (
                  <Fingerprint className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <Mail className="w-8 h-8 text-primary-foreground" />
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                {step === "matric" ? "Voter Login" : 
                 step === "auth" ? "Authenticate" : 
                 step === "complete-setup" ? "Complete Setup" : 
                 "Verify OTP"}
              </h1>
              <p className="text-muted-foreground">
                {step === "matric" 
                  ? "Enter your matric number to continue" 
                  : step === "auth"
                  ? "Choose your authentication method"
                  : step === "complete-setup"
                  ? "Complete your registration to proceed"
                  : "Enter the code sent to your email"}
              </p>
            </div>

            {step === "matric" ? (
              <form onSubmit={handleMatricSubmit} className="space-y-6">
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
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: YY/YYddd### (e.g., 21/08nus014)
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
                      Verifying...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            ) : step === "complete-setup" ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Setup Required:</strong> You need to complete your biometric setup or OTP verification to finish your registration.
                  </p>
                </div>
                <BiometricSetup
                  voterId={voterId}
                  email={email}
                  onComplete={handleSetupComplete}
                />
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep("matric")}
                  type="button"
                >
                  Back to Matric Entry
                </Button>
              </div>
            ) : step === "auth" ? (
              <div className="space-y-4">
                <Button 
                  onClick={handleBiometricAuth}
                  className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5 mr-2" />
                      Use Biometric
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={handleOTPRequest}
                  variant="outline"
                  className="w-full text-lg py-6"
                  disabled={isLoading}
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Use OTP Instead
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep("matric")}
                  type="button"
                >
                  Back to Matric Entry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleOTPVerify} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    maxLength={6}
                    className="text-lg text-center tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Check your email: {email}
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
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </Button>

                <div className="flex justify-between text-sm">
                  <Button
                    variant="link"
                    className="p-0 h-auto text-muted-foreground"
                    onClick={handleOTPRequest}
                    type="button"
                    disabled={isLoading}
                  >
                    Resend Code
                  </Button>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-muted-foreground"
                    onClick={() => setStep("auth")}
                    type="button"
                  >
                    Try Biometric
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-8 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-foreground">Security Notice</h4>
              <p className="text-xs text-muted-foreground">
                {step === "matric" 
                  ? "Your matric number is verified against our secure student roster."
                  : step === "auth"
                  ? "Biometric data never leaves your device. OTP is sent securely to your registered email."
                  : step === "complete-setup"
                  ? "Complete your verification to secure your voting account."
                  : "OTP codes expire after 10 minutes for your security."}
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VotersLogin;