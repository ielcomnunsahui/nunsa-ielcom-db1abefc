import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BiometricSetupProps {
  voterId: string;
  email: string;
  onComplete: () => void;
}

export const BiometricSetup = ({ voterId, email, onComplete }: BiometricSetupProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [useBiometric, setUseBiometric] = useState(true);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showOtp, setShowOtp] = useState("");
  const { toast } = useToast();

  const isBiometricAvailable = () => {
    return window.PublicKeyCredential !== undefined;
  };

  const registerBiometric = async () => {
    try {
      setIsLoading(true);

      if (!isBiometricAvailable()) {
        toast({
          title: "Biometric Not Available",
          description: "Your device doesn't support biometric authentication. We'll send you an OTP instead.",
          variant: "destructive",
        });
        handleOtpFallback();
        return;
      }

      // Create credential options
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "NUNSA Voting System",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(voterId),
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      // Store credential in database
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey()!)));

      const { error } = await supabase.functions.invoke("register-biometric", {
        body: { voterId, credentialId, publicKey },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Biometric authentication registered successfully.",
      });

      onComplete();
    } catch (error: any) {
      console.error("Biometric registration error:", error);
      toast({
        title: "Biometric Registration Failed",
        description: "Falling back to OTP verification.",
        variant: "destructive",
      });
      handleOtpFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpFallback = async () => {
    setUseBiometric(false);
    await sendOtp();
  };

  const sendOtp = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { voterId, email },
      });

      if (error) throw error;

      setOtpSent(true);
      setShowOtp(data.otp); // Remove in production
      toast({
        title: "OTP Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast({
        title: "Failed to Send OTP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase.functions.invoke("verify-otp", {
        body: { voterId, otpCode: otp },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your account has been verified.",
      });

      onComplete();
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Verify Your Account</h2>
        <p className="text-muted-foreground">
          {useBiometric
            ? "Use biometric authentication for secure, convenient access"
            : "Enter the OTP sent to your email"}
        </p>
      </div>

      {useBiometric ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="p-6 bg-primary/10 rounded-full">
              <Fingerprint className="w-16 h-16 text-primary" />
            </div>
            <Button
              onClick={registerBiometric}
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:shadow-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 mr-2" />
                  Register Biometric
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={handleOtpFallback}
              disabled={isLoading}
            >
              <Mail className="w-4 h-4 mr-2" />
              Use OTP Instead
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!otpSent ? (
            <Button
              onClick={sendOtp}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Send OTP
                </>
              )}
            </Button>
          ) : (
            <>
              {showOtp && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Dev Mode:</strong> Your OTP is <strong>{showOtp}</strong>
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button
                onClick={verifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
              <Button
                variant="link"
                onClick={sendOtp}
                disabled={isLoading}
                className="w-full"
              >
                Resend OTP
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
};