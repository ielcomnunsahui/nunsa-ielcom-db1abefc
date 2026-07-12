import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Mail, Hash, KeyRound, PartyPopper, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MessageCircle, AlertTriangle } from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

async function invokeEdge<T = any>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const txt = await error.context.text();
        const parsed = JSON.parse(txt);
        if (parsed?.error) msg = parsed.error;
      } catch { /* ignore */ }
    }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

interface Props {
  onComplete?: () => void;
  /** Text shown in the success step (defaults to voter registration) */
  successMessage?: string;
}

export default function RegistrationFlow({ onComplete, successMessage }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [matric, setMatric] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [ineligibleOpen, setIneligibleOpen] = useState(false);
  const [ineligibleMatric, setIneligibleMatric] = useState("");
  const timerRef = useRef<number | null>(null);
  const cdRef = useRef<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 3 || secondsLeft <= 0) return;
    timerRef.current = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [step, secondsLeft]);

  useEffect(() => {
    if (cooldown <= 0) return;
    cdRef.current = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => { if (cdRef.current) window.clearInterval(cdRef.current); };
  }, [cooldown]);

  useEffect(() => {
    if (step !== 5) return;
    const end = Date.now() + 4000;
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors });
  }, [step]);

  const goto = (s: Step) => setStep(s);

  // Step 1: matric check
  const handleMatric = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = matric.trim().toLowerCase();
    if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/.test(v)) {
      return toast({ title: "Invalid matric format", description: "Example: 21/08nus014", variant: "destructive" });
    }
    setIsLoading(true);
    try {
      const data = await invokeEdge<{ name: string; matric: string; alreadyRegistered: boolean }>("check-matric", { matric: v });
      if (data.alreadyRegistered) {
        throw new Error("This matric number is already registered. Please log in instead.");
      }
      setMatric(data.matric);
      setName(data.name);
      goto(2);
    } catch (err: any) {
      const msg: string = err?.message ?? "Please try again.";
      if (/not on the eligible voter list|not eligible/i.test(msg)) {
        setIneligibleMatric(v);
        setIneligibleOpen(true);
      } else {
        toast({ title: "Cannot proceed", description: msg, variant: "destructive" });
      }
    } finally { setIsLoading(false); }
  };

  // Step 2: email → send OTP
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/.+@.+\..+/.test(v)) return toast({ title: "Invalid email", variant: "destructive" });
    setEmail(v);
    setIsLoading(true);
    try {
      const data = await invokeEdge<{ registrationId: string; expiresInSeconds: number }>("register-start", { name, matric, email: v });
      setRegistrationId(data.registrationId);
      setSecondsLeft(data.expiresInSeconds ?? 600);
      setCooldown(45);
      toast({ title: "Verification code sent", description: `Check your inbox at ${v}.` });
      goto(3);
    } catch (err: any) {
      toast({ title: "Could not send code", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    try {
      await invokeEdge("register-verify", { registrationId, otpCode: otp });
      toast({ title: "Email verified" });
      goto(4);
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message ?? "Invalid or expired code.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      const data = await invokeEdge<{ expiresInSeconds: number }>("register-resend", { registrationId });
      setSecondsLeft(data.expiresInSeconds ?? 600);
      setCooldown(45);
      setOtp("");
      toast({ title: "New code sent", description: `Check your inbox at ${email}.` });
    } catch (err: any) {
      toast({ title: "Could not resend", description: err?.message ?? "Try again shortly.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast({ title: "Weak password", description: "Password must be at least 8 characters.", variant: "destructive" });
    if (password !== confirmPassword) return toast({ title: "Passwords don't match", variant: "destructive" });
    setIsLoading(true);
    try {
      await invokeEdge("register-complete", { registrationId, password });
      goto(5);
      onComplete?.();
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      <Dialog open={ineligibleOpen} onOpenChange={setIneligibleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Matric Not Eligible
            </DialogTitle>
            <DialogDescription>
              The matric number <span className="font-mono font-semibold">{ineligibleMatric.toUpperCase()}</span> is not on the admin-uploaded eligible voter list.
              Please contact the Electoral Committee to be added.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-md border bg-muted/40 text-sm">
            <div className="font-semibold text-foreground">Deputy Chairman, IELCOM</div>
            <div className="text-muted-foreground">Ahmad Usman Girka — +234 912 350 2971</div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIneligibleOpen(false)}>Close</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                const msg = `Hello Deputy Chairman, my matric number *${ineligibleMatric.toUpperCase()}* is not on the eligible voter list. Please add me so I can register for the 2026/2027 NUNSA Election.`;
                window.open(`https://wa.me/2349123502971?text=${encodeURIComponent(msg)}`, "_blank");
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Message on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-1 text-foreground">
          {step === 5 ? "Congratulations! 🎉" : "Voter Registration"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {step === 1 && "Step 1 of 4 — Enter your matric number"}
          {step === 2 && "Step 2 of 4 — Confirm identity & enter email"}
          {step === 3 && `Step 3 of 4 — Enter the 6-digit code sent to ${email}`}
          {step === 4 && "Step 4 of 4 — Create your password"}
          {step === 5 && (successMessage ?? "You've registered as a voter for the 2026/2027 NUNSA Election.")}
        </p>
        {step < 5 && <Progress value={(step / 4) * 100} className="mt-4" />}
      </div>

      {step === 1 && (
        <form onSubmit={handleMatric} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="matric" className="flex items-center gap-2"><Hash className="w-4 h-4" /> Matric Number</Label>
            <Input id="matric" value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="21/08nus014" required maxLength={50} autoFocus />
            <p className="text-xs text-muted-foreground">We'll check this against the admin-uploaded eligible voter list.</p>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking...</> : <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>}
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleEmail} className="space-y-5">
          <div className="p-4 rounded-lg border bg-muted/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-foreground">{name}</div>
              <div className="text-muted-foreground">{matric.toUpperCase()}</div>
              <div className="text-xs text-green-700 mt-1">Eligible voter confirmed</div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required maxLength={255} autoFocus />
            <p className="text-xs text-muted-foreground">We'll send a 6-digit verification code to this email.</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => goto(1)} disabled={isLoading}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button type="submit" className="flex-1 bg-gradient-primary hover:shadow-glow" disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <>Send Code <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleVerify} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input id="otp" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required maxLength={6} className="text-2xl text-center tracking-[0.5em]" autoFocus />
            <p className="text-xs text-muted-foreground text-center">
              {secondsLeft > 0 ? <>Code expires in <span className="font-mono">{fmt(secondsLeft)}</span></> : <span className="text-destructive">Code expired — request a new one.</span>}
            </p>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6" disabled={isLoading || otp.length !== 6 || secondsLeft <= 0}>
            {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</> : "Verify Email"}
          </Button>
          <div className="flex justify-between text-sm">
            <Button variant="link" className="p-0 h-auto" type="button" onClick={handleResend} disabled={isLoading || cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
            <Button variant="link" className="p-0 h-auto" type="button" onClick={() => goto(2)}>Change email</Button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleComplete} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pw" className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Create Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} maxLength={72} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpw">Confirm Password</Label>
            <Input id="cpw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required minLength={8} maxLength={72} />
            <p className="text-xs text-muted-foreground">You'll use this password to log in on election day.</p>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow text-lg py-6" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating account...</> : "Complete Registration"}
          </Button>
        </form>
      )}

      {step === 5 && (
        <div className="text-center space-y-6 py-4">
          <div className="text-6xl"><PartyPopper className="w-16 h-16 mx-auto text-primary" /></div>
          <p className="text-foreground">
            Your account is verified. Come back on election day and log in with your
            <strong> email</strong> and <strong>password</strong> to cast your vote.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1">Go Home</Button>
            <Button onClick={() => navigate("/aspirant-login")} className="flex-1 bg-gradient-primary hover:shadow-glow">Aspirant Portal</Button>
          </div>
        </div>
      )}
    </div>
  );
}
