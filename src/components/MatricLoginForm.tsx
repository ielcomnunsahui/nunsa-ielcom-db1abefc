import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, LogIn, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";

type Step = "login" | "forgot-matric" | "forgot-otp" | "forgot-done";

interface Props {
  onSuccess: () => void;
  variant?: "primary" | "secondary";
  loginLabel?: string;
}

const MATRIC_RE = /^\d{2}\/\d{2}[a-z]{3}\d{3}$/;

async function invoke<T = any>(fn: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // Try to parse the returned body for a meaningful error
    let msg = error.message;
    try {
      const ctx: any = (error as any).context;
      if (ctx?.text) {
        const txt = await ctx.text();
        const parsed = JSON.parse(txt);
        if (parsed?.error) msg = parsed.error;
      }
    } catch {}
    throw new Error(msg);
  }
  return data as T;
}

const MatricLoginForm = ({ onSuccess, variant = "primary", loginLabel = "Log In" }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Login
  const [matric, setMatric] = useState("");
  const [password, setPassword] = useState("");

  // Forgot
  const [resetMatric, setResetMatric] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const btnClass = variant === "secondary" ? "w-full bg-gradient-secondary" : "w-full bg-gradient-primary";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = matric.trim().toLowerCase();
    if (!MATRIC_RE.test(m)) {
      toast({ title: "Invalid matric", description: "Format: 21/08nus014", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Enter your password", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { email } = await invoke<{ email: string }>("login-with-matric", { matric: m });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Login successful", description: "Redirecting..." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message ?? "Try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = resetMatric.trim().toLowerCase();
    if (!MATRIC_RE.test(m)) {
      toast({ title: "Invalid matric", description: "Format: 21/08nus014", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { email } = await invoke<{ email: string }>("password-reset-start", { matric: m });
      setResetEmail(email);
      setStep("forgot-otp");
      toast({ title: "Code sent", description: `We sent a code to ${email}` });
    } catch (err: any) {
      toast({ title: "Could not send code", description: err?.message ?? "Try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await invoke("password-reset-complete", { matric: resetMatric.trim().toLowerCase(), otp, newPassword: newPw });
      setStep("forgot-done");
      toast({ title: "Password updated", description: "You can now log in." });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err?.message ?? "Try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "forgot-matric") {
    return (
      <form onSubmit={handleSendResetOtp} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button type="button" onClick={() => setStep("login")} className="inline-flex items-center hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
          </button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fp-matric">Matric Number</Label>
          <Input
            id="fp-matric"
            value={resetMatric}
            onChange={(e) => setResetMatric(e.target.value)}
            placeholder="21/08nus014"
            required
          />
          <p className="text-xs text-muted-foreground">We'll send a 6-digit code to your registered email.</p>
        </div>
        <Button type="submit" className={btnClass} disabled={isLoading}>
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending code...</> : <><KeyRound className="w-4 h-4 mr-2" />Send Reset Code</>}
        </Button>
      </form>
    );
  }

  if (step === "forgot-otp") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button type="button" onClick={() => setStep("forgot-matric")} className="inline-flex items-center hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Change matric
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Enter the code sent to <strong>{resetEmail}</strong> and set a new password.</p>
        <div className="space-y-2">
          <Label htmlFor="fp-otp">Verification Code</Label>
          <Input id="fp-otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" maxLength={6} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fp-new">New Password</Label>
          <Input id="fp-new" type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fp-confirm">Confirm New Password</Label>
          <Input id="fp-confirm" type={showPw ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter password" required />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowPw((s) => !s)} className="text-xs text-muted-foreground inline-flex items-center hover:text-foreground">
            {showPw ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
            {showPw ? "Hide" : "Show"} password
          </button>
          <button type="button" onClick={handleSendResetOtp as any} className="ml-auto text-xs text-primary hover:underline" disabled={isLoading}>
            Resend code
          </button>
        </div>
        <Button type="submit" className={btnClass} disabled={isLoading}>
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Set New Password"}
        </Button>
      </form>
    );
  }

  if (step === "forgot-done") {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-700 rounded-full">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold">Password updated</h3>
        <p className="text-sm text-muted-foreground">Log in with your matric number and new password.</p>
        <Button className={btnClass} onClick={() => { setStep("login"); setMatric(resetMatric); setPassword(""); }}>
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="matric">Matric Number</Label>
        <Input id="matric" value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="21/08nus014" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button type="button" onClick={() => { setResetMatric(matric); setStep("forgot-matric"); }} className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Input id="password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPw((s) => !s)}>
            {showPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>
      <Button type="submit" className={btnClass} disabled={isLoading}>
        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : <><LogIn className="w-4 h-4 mr-2" />{loginLabel}</>}
      </Button>
    </form>
  );
};

export default MatricLoginForm;