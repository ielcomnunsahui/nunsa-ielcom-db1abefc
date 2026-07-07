import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, LogIn, UserPlus, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 1. NEW STATE: Track the consent checkbox status
  const [isConsentChecked, setIsConsentChecked] = useState(false); 
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isLoading: authLoading } = useAuth();

  // Get the return URL from location state or default to home
  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    // Check if user is already logged in
    if (!authLoading && user && role) {
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate(returnTo);
      }
    }
  }, [user, role, authLoading, navigate, returnTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.email}!`,
        });

        // The useEffect will handle navigation based on role
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Invalid email or password";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // **NOTE: The button is disabled if consent is not checked. This check is primarily for redundancy
    // or if the button disable is somehow bypassed (e.g., via script injection).**
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    // Explicitly check for consent before starting API call
    if (!isConsentChecked) {
        toast({
            title: "Consent Required",
            description: "You must agree to the Terms & Data Protection Consent to create an account.",
            variant: "destructive",
        });
        return;
    }


    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Account Created Successfully",
          description: "You now have full access to the platform. You can apply for positions, register as a voter, and participate in elections.",
        });

        // Clear form
        setSignupData({
          email: "",
          password: "",
          confirmPassword: "",
        });
        
        // Auto-fill login form
        setLoginData({
          email: signupData.email,
          password: "",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create account";
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if auth is still loading
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
              General Login
            </h1>
            <p className="text-lg text-muted-foreground">
              Access all platform features - voting, aspirant applications, and more
            </p>
          </div>

          <Card className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter your password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Log In
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={signupData.password}
                        onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Create a password (min 6 characters)"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3 p-3 bg-muted/20 rounded-md text-xs text-muted-foreground">
                    <h3 className="font-semibold text-foreground text-sm">Terms & Data Protection Consent</h3>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>
                        I consent to the verification of my matric number, email, and student status for
                        election eligibility.
                      </li>
                      <li>
                        I agree to the collection and secure storage of my biometric data (Face ID or
                        fingerprint) solely for identity verification and preventing multiple voting.
                      </li>
                      <li>
                        If biometrics are unavailable, I agree to receive OTP authentication via email or phone.
                      </li>
                      <li>
                        I understand that my data will be used only for voter registration, secure login,
                        aspirant screening, communication, and transparent election result processing.
                      </li>
                      <li>
                        I acknowledge that AHSS complies with the Nigeria Data Protection Regulation (NDPR)
                        and uses appropriate security measures to protect my data.
                      </li>
                      <li>
                        I understand that biometric data will be deleted after the election cycle.
                      </li>
                      <li>
                        By signing up, I confirm that all provided information is accurate and belongs to me.
                      </li>
                    </ul>

                    {/* 2. UPDATED CHECKBOX: Use state to control checked status */}
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="terms"
                        // Removed 'required' attribute for React control
                        checked={isConsentChecked}
                        onChange={(e) => setIsConsentChecked(e.target.checked)}
                        className="h-4 w-4 border-muted-foreground"
                      />
                      <label htmlFor="terms" className="text-xs text-foreground font-medium">
                        I have read and agree to the Terms & Data Protection Consent.
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-secondary"
                    // 3. UPDATED DISABLED PROP: Button is disabled if loading OR consent is not checked
                    disabled={isLoading || !isConsentChecked}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Need admin access?
            </p>
            <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/admin-login")}>
              Admin Login
            </Button>
          </div>

          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Full Platform Access</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• View and apply for leadership positions</li>
              <li>• Register as a voter and participate in elections</li>
              <li>• Access all election information and candidate profiles</li>
              <li>• Track your applications and voting status</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;