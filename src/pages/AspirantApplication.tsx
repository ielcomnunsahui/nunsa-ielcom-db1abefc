import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import NUNSALogo from "@/assets/Ielcom-logo.png"; 
import { 
  Trophy, ArrowLeft, ArrowRight, Upload, Download, MessageCircle, 
  Loader2, CheckCircle2, AlertCircle, Lock, Save, FileText, Printer, User, DollarSign, Calendar
} from "lucide-react";
import { z } from "zod";
import { User as AuthUser } from "@supabase/supabase-js";

// --- Type Definitions ---

interface Position {
  id: string;
  name: string;
  application_fee: number;
  min_cgpa: number;
  eligible_levels: string[];
  description: string;
}

interface ApplicationData {
  // Step 1: Personal
  photo: File | null;
  photoPreviewUrl: string | null;
  photoUploaded: boolean; // Track if photo was uploaded
  full_name: string;
  matric: string;
  department: string;
  level: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  
  // Step 2: Position
  position_id: string;
  why_running: string;
  
  // Step 3: Academic
  cgpa: string;
  
  // Step 4: Leadership
  leadership_history: string;
  
  // Step 5: Payment
  payment_proof: File | null;
  paymentProofPreviewUrl: string | null;
  paymentProofUploaded: boolean; // Track if payment proof was uploaded
}

// --- Zod Schemas ---
const matricSchema = z.string().regex(/^[0-9]{2}\/[0-9]{2}[A-Za-z]{3}[0-9]{3}$/, "Invalid matric format (e.g., 21/08NUS014)");
const phoneSchema = z.string().regex(/^[0-9]{11}$/, "Phone must be 11 digits");
const cgpaSchema = z.number().min(2.0).max(5.0);

// --- Constants ---
const departments = [
  "Nursing", "Anatomy", "Physiology", "Medical Lab Science", "MBBS", "Public Health"
];
const levels = ["100L", "200L", "300L", "400L", "500L"];
const TOTAL_STEPS = 6;

// --- Utility Components for Step 6 Review ---

/** Displays a single key-value pair in the review summary. */
const ReviewItem = ({ label, value, isFile = false }: { label: string, value: string | number | undefined | null, isFile?: boolean }) => (
  <div className="flex justify-between border-b pb-2 mb-2 last:border-b-0 last:mb-0">
    <span className="text-sm font-medium text-muted-foreground">{label}:</span>
    <span className="text-sm font-semibold text-foreground break-all">
      {isFile ? (value ? 'File Uploaded' : 'Missing File') : (value ? value.toString() : 'N/A')}
    </span>
  </div>
);

/** Wraps a section of the review summary. */
const ReviewSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <Card className="p-4 sm:p-5 border-l-4 border-secondary/80 bg-secondary/5 shadow-sm">
    <h3 className="text-md font-bold mb-3 text-secondary flex items-center gap-2">
      {title === '1. Personal Information' && <User className="w-4 h-4"/>}
      {title === '2. Position & Motivation' && <Trophy className="w-4 h-4"/>}
      {title === '3. Academic Information' && <Calendar className="w-4 h-4"/>}
      {title === '4. Leadership Experience' && <FileText className="w-4 h-4"/>}
      {title === '5. Payment Proof' && <DollarSign className="w-4 h-4"/>}
      {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </Card>
);

// --- Main Component ---

const AspirantApplication = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    photo: null,
    photoPreviewUrl: null,
    photoUploaded: false,
    full_name: "",
    matric: "",
    department: "",
    level: "",
    dob: "",
    gender: "",
    phone: "",
    email: "",
    position_id: "",
    why_running: "",
    cgpa: "",
    leadership_history: "",
    payment_proof: null,
    paymentProofPreviewUrl: null,
    paymentProofUploaded: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const hasCheckedAuth = useRef(false);

  // Auto-save functionality to prevent data loss
  const autoSave = useCallback(async () => {
    if (!user || currentStep === 6) return; // Don't auto-save on final step
    
    try {
      const { photo, payment_proof, ...dataToSave } = applicationData;
      
      const progressData = {
        data: {
          ...dataToSave,
          // Always save the upload status and preview URLs
          photoUploaded: applicationData.photoUploaded,
          paymentProofUploaded: applicationData.paymentProofUploaded,
        },
        currentStep,
        savedSteps: Array.from(savedSteps),
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(`aspirant_draft_${user.id}`, JSON.stringify(progressData));
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [user, currentStep, applicationData, savedSteps]);

  // Auto-save every 30 seconds and on data changes
  useEffect(() => {
    const interval = setInterval(autoSave, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [autoSave]);

  useEffect(() => {
    autoSave(); // Save on data changes
  }, [applicationData, autoSave]);

  // Authentication check
 const checkAuthentication = useCallback(async () => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({ title: "Login Required", description: "Please log in to continue.", variant: "destructive" });
        navigate("/aspirant-login", { state: { returnTo: "aspirant" } });
        return;
      }
      setUser(authUser);
      await loadSavedProgress(authUser.id);
    } catch (error) {
      toast({ title: "Auth Error", description: "Please log in again.", variant: "destructive" });
      navigate("/login");
    } finally {
      setIsCheckingAuth(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  // Handle visibility change (Android returning from file picker)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Restore draft silently
        loadSavedProgress(user.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Load saved progress from localStorage
  const loadSavedProgress = async (userId: string) => {
    try {
      const savedData = localStorage.getItem(`aspirant_draft_${userId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Restore all data including upload status
        const { photo, payment_proof, ...restData } = parsedData.data;
        
        setApplicationData(prev => ({ 
            ...prev, 
            ...restData, 
            photo: null, // Files can't be restored, but we track upload status
            payment_proof: null,
        }));
        setCurrentStep(parsedData.currentStep || 1);
        setSavedSteps(new Set(parsedData.savedSteps || []));
        
        toast({
          title: "Progress Restored",
          description: "Your previous progress has been restored. Files need to be re-uploaded for final submission.",
        });
      }
    } catch (error) {
      console.error("Error loading saved progress:", error);
    }
  };

  // Save progress to localStorage
  const saveProgress = async (step: number) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await autoSave(); // Use the auto-save function
      setSavedSteps(prev => new Set([...prev, step]));
      
      toast({
        title: "Progress Saved",
        description: `Step ${step} has been saved.`,
      });
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load positions
  const loadPositions = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("aspirant_positions")
        .select("id, name, application_fee, min_cgpa, description, eligible_levels") 
        .eq("is_open", true)
        .order("application_fee", { ascending: false });

      if (error) throw error;
      setPositions(data as Position[] || []); 
    } catch (error) {
      console.error("Error loading positions:", error);
      toast({
        title: "Error",
        description: "Failed to load positions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]); 

  // Initial load effect
  useEffect(() => {
    if (user && !isCheckingAuth) {
      loadPositions();
      
      const preSelectedPosition = location.state?.selectedPosition;
      if (preSelectedPosition) {
        setSelectedPosition(preSelectedPosition);
        setApplicationData(prev => ({ ...prev, position_id: preSelectedPosition.id }));
      }
    }
  }, [location.state, loadPositions, user, isCheckingAuth]);

  // Validation logic - Updated to check upload status instead of File object
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!applicationData.full_name.trim()) errors.full_name = "Full name is required";
        try {
          matricSchema.parse(applicationData.matric);
        } catch {
          errors.matric = "Invalid matric format (e.g., 21/08NUS001)";
        }
        if (!applicationData.department) errors.department = "Department is required";
        if (!applicationData.level) errors.level = "Level is required";
        if (!applicationData.dob) errors.dob = "Date of birth is required";
        if (!applicationData.gender) errors.gender = "Gender is required";
        try {
          phoneSchema.parse(applicationData.phone);
        } catch {
          errors.phone = "Phone must be 11 digits";
        }
        if (!applicationData.email.includes("@")) errors.email = "Valid email is required";
        break;
        
      case 2: {
        if (!applicationData.position_id) errors.position_id = "Position is required";
        if (selectedPosition) {
            const applicantLevel = applicationData.level;
            const eligibleLevels = selectedPosition.eligible_levels;

            if (!eligibleLevels.includes(applicantLevel)) {
                errors.position_level_error = `Your level (${applicantLevel}) is not eligible for the position: ${selectedPosition.name}. Eligible levels: ${eligibleLevels.map(l => `${l}`).join(', ')}`;
            }
        }
        const wordCount = applicationData.why_running.trim().split(/\s+/).length;
        if (wordCount < 10 || wordCount > 1000) {
          errors.why_running = "Why running must be between 10-1000 words";
        }
        break;
      }
      case 3: {
        try {
          const cgpa = parseFloat(applicationData.cgpa);
          cgpaSchema.parse(cgpa);
          if (selectedPosition && cgpa < selectedPosition.min_cgpa) {
            errors.cgpa = `CGPA must be at least ${selectedPosition.min_cgpa} for this position`;
          }
        } catch {
          errors.cgpa = "CGPA must be between 2.00-5.00";
        }
        break;
      }
      case 4: {
        const leadershipWords = applicationData.leadership_history.trim().split(/\s+/).length;
        if (leadershipWords < 20) {
          errors.leadership_history = "Leadership history must be at least 20 words";
        }
        break;
      }
      case 5:
        
        break;
      
      case 6:
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      await saveProgress(currentStep);
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill all the fields correctly before proceeding.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setIsConfirmed(false);
  };

  const handleFileUpload = (field: keyof ApplicationData, file: File | null) => {
    if (file) {
      const maxSize = field === 'photo' ? 1 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `File must be less than ${field === 'photo' ? '1MB' : '2MB'}`,
          variant: "destructive",
        });
        return;
      }
      
      const allowedTypes = field === 'photo' 
        ? ['image/jpeg', 'image/png'] 
        : ['image/jpeg', 'image/png', 'application/pdf'];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: field === 'photo' ? "Only JPG/PNG allowed" : "Only JPG/PNG/PDF allowed",
          variant: "destructive",
        });
        return;
      }

      // Create preview URL and store both file and upload status
      const previewUrl = URL.createObjectURL(file);
      if (field === 'photo') {
        setApplicationData(prev => ({ 
          ...prev, 
          photo: file, 
          photoPreviewUrl: previewUrl,
          photoUploaded: true // Mark as uploaded
        }));
        toast({
          title: "Photo Uploaded",
          description: "Profile photo has been uploaded successfully.",
        });
      } else if (field === 'payment_proof') {
        setApplicationData(prev => ({ 
          ...prev, 
          payment_proof: file, 
          paymentProofPreviewUrl: previewUrl,
          paymentProofUploaded: true // Mark as uploaded
        }));
        toast({
          title: "Payment Proof Uploaded",
          description: "Payment proof has been uploaded successfully.",
        });
      }
    } else {
      // Clear file and upload status
      if (field === 'photo') {
        setApplicationData(prev => ({ 
          ...prev, 
          photo: null, 
          photoPreviewUrl: null,
          photoUploaded: false
        }));
      } else if (field === 'payment_proof') {
        setApplicationData(prev => ({ 
          ...prev, 
          payment_proof: null, 
          paymentProofPreviewUrl: null,
          paymentProofUploaded: false
        }));
      }
    }
  };

  const handleSubmitApplication = async () => {
    if (currentStep !== TOTAL_STEPS || !isConfirmed) {
        toast({
            title: "Action Required",
            description: "Please confirm your declaration before submitting.",
            variant: "destructive",
        });
        return;
    }
    
    // Final validation - ensure files are actually present for submission
    if (!applicationData.photo) {
      toast({
        title: "Missing Photo",
        description: "Please re-upload your profile photo before submitting.",
        variant: "destructive",
      });
      setCurrentStep(5);
      return;
    }
    
    
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const { data: existingApplication, error: fetchError } = await supabase
          .from("aspirants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
          
        if (existingApplication) {
            setIsSubmitting(false);
            toast({
                title: "Application Already Submitted",
                description: "You have already submitted an application. Please check your dashboard for status.",
                variant: "destructive",
            });
            return; 
        }
        
        if (fetchError && fetchError.code !== 'PGRST116') { 
             throw fetchError;
        }
      
      const uploadedUrls: Record<string, string> = {};
      
      if (applicationData.photo) {
        const photoPath = `photos/${user.id}_${Date.now()}_${applicationData.photo.name}`;
        const { data: photoUpload, error: photoError } = await supabase.storage
          .from('aspirant-documents')
          .upload(photoPath, applicationData.photo);
        
        if (photoError) throw photoError;
        
        const { data: photoUrl } = supabase.storage
          .from('aspirant-documents')
          .getPublicUrl(photoPath);
        
        uploadedUrls.photo_url = photoUrl.publicUrl;
      }
      
      if (applicationData.payment_proof) {
        const paymentPath = `payments/${user.id}_${Date.now()}_${applicationData.payment_proof.name}`;
        const { data: paymentUpload, error: paymentError } = await supabase.storage
          .from('aspirant-documents')
          .upload(paymentPath, applicationData.payment_proof);
        
        if (paymentError) throw paymentError;
        
        const { data: paymentUrl } = supabase.storage
          .from('aspirant-documents')
          .getPublicUrl(paymentPath);
        
        uploadedUrls.payment_proof_url = paymentUrl.publicUrl;
      }
      
      // Create application record
      const { data: aspirant, error } = await supabase
        .from("aspirants")
        .insert({
          user_id: user.id,
          full_name: applicationData.full_name,
          matric: applicationData.matric.toLowerCase(),
          email: applicationData.email,
          phone: applicationData.phone,
          department: applicationData.department,
          level: applicationData.level,
          date_of_birth: applicationData.dob,
          gender: applicationData.gender,
          cgpa: parseFloat(applicationData.cgpa),
          position_id: applicationData.position_id,
          why_running: applicationData.why_running,
          leadership_history: applicationData.leadership_history,
          ...uploadedUrls,
          status: "submitted",
          admin_review_status: "pending",
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Store matric for future dashboard access
      localStorage.setItem("aspirantMatric", applicationData.matric.toLowerCase());
      
      // Clear saved draft
      localStorage.removeItem(`aspirant_draft_${user.id}`);
      
      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted successfully. You can track its progress on your dashboard.",
      });
      
      navigate("/aspirant");
      
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  


   const handleDownload = () => {
    window.open('/ielcomform.pdf', '_blank');
  };

  
  const openWhatsApp = () => {
    window.open("https://wa.me/2347040640646", "_blank");
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Personal Information";
      case 2: return "Position & Motivation";
      case 3: return "Academic Information";
      case 4: return "Leadership Experience";
      case 5: return "Payment Proof";
      case 6: return "Review & Final Confirmation";
      default: return "";
    }
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;

  if (isCheckingAuth || isLoading || !user) {
    const isAuthError = !isCheckingAuth && !user;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 sm:pt-24 px-2 sm:px-4 pb-12 flex items-center justify-center min-h-[60vh]">
          {isAuthError ? (
            <div className="container mx-auto max-w-2xl text-center">
              <Card className="p-6 sm:p-8">
                <div className="mb-6">
                  <Lock className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                  <h1 className="text-xl sm:text-2xl font-bold mb-2">Authentication Required</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">You need to be logged in to access the aspirant application form.</p>
                </div>
                <Button 
                  onClick={() => navigate("/login", { state: { returnTo: "/aspirant/apply" } })}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Log In to Continue
                </Button>
              </Card>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">{isCheckingAuth ? "Checking authentication..." : "Loading application form..."}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="pt-20 sm:pt-24 px-2 sm:px-4 pb-12">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-primary/10 rounded-full shadow-lg mb-4">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-foreground">
              NUNSA Aspirant Application
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-semibold">
              Step {currentStep} of {TOTAL_STEPS}: <span className="text-primary">{getStepTitle()}</span>
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span>Authenticated as {user.email}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border-l-4 border-primary">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Application Progress</span>
                <span className="text-primary">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            
            <div className="grid grid-cols-6 gap-1 sm:gap-2 mt-4 text-xs">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div key={step} className={`text-center p-1 sm:p-2 rounded font-medium transition-colors duration-300 ${
                  step === currentStep ? 'bg-primary text-primary-foreground shadow-md' :
                  step < currentStep ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    Step {step}
                    {savedSteps.has(step) && <Save className="w-3 h-3 ml-1" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Application Form Card */}
          <Card className="p-4 sm:p-6 lg:p-8 shadow-2xl">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Personal Information</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={applicationData.full_name}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                    {validationErrors.full_name && <p className="text-sm text-destructive">{validationErrors.full_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="matric">Matric Number *</Label>
                    <Input
                      id="matric"
                      value={applicationData.matric}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, matric: e.target.value }))}
                      placeholder="21/08NUS001"
                    />
                    {validationErrors.matric && <p className="text-sm text-destructive">{validationErrors.matric}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select value={applicationData.department} onValueChange={(value) => setApplicationData(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {validationErrors.department && <p className="text-sm text-destructive">{validationErrors.department}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Level *</Label>
                    <Select value={applicationData.level} onValueChange={(value) => setApplicationData(prev => ({ ...prev, level: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (<SelectItem key={level} value={level}>{level}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {validationErrors.level && <p className="text-sm text-destructive">{validationErrors.level}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input id="dob" type="date" value={applicationData.dob} onChange={(e) => setApplicationData(prev => ({ ...prev, dob: e.target.value }))} />
                    {validationErrors.dob && <p className="text-sm text-destructive">{validationErrors.dob}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={applicationData.gender} onValueChange={(value) => setApplicationData(prev => ({ ...prev, gender: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.gender && <p className="text-sm text-destructive">{validationErrors.gender}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={applicationData.phone}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="08012345678"
                      maxLength={11}
                    />
                    {validationErrors.phone && <p className="text-sm text-destructive">{validationErrors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={applicationData.email}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@example.com"
                    />
                    {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Position & Motivation */}
            {currentStep === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Position & Motivation</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="position_id">Select Position *</Label>
                  <Select 
                    value={applicationData.position_id} 
                    onValueChange={(value) => {
                      setApplicationData(prev => ({ ...prev, position_id: value }));
                      const position = positions.find(p => p.id === value);
                      setSelectedPosition(position || null);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a position to apply for" /></SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name} - ₦{position.application_fee.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.position_id && <p className="text-sm text-destructive">{validationErrors.position_id}</p>}
                  
                  {validationErrors.position_level_error && (
                    <div className="mt-2 p-3 bg-red-100 border border-destructive rounded-md">
                        <p className="text-sm text-destructive font-medium">
                            {validationErrors.position_level_error}
                        </p>
                        </div>
                  )}
                </div>

                {selectedPosition && (
                  <Card className="p-4 bg-muted/30">
                    <h3 className="font-semibold mb-2">{selectedPosition.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{selectedPosition.description}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">
                          Levels: {selectedPosition.eligible_levels.map(l => `${l}`).join(', ')}
                      </Badge>
                      <Badge variant="outline">Fee: ₦{selectedPosition.application_fee.toLocaleString()}</Badge>
                    </div>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="why_running">Why are you running for this position? *</Label>
                  <Textarea
                    id="why_running"
                    value={applicationData.why_running}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, why_running: e.target.value }))}
                    placeholder="Explain your motivation, vision, and what you hope to achieve in this role..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum 20 words, maximum 1000 words</span>
                    <span>{applicationData.why_running.trim().split(/\s+/).length} words</span>
                  </div>
                  {validationErrors.why_running && <p className="text-sm text-destructive">{validationErrors.why_running}</p>}
                </div>
              </div>
            )}
            
            {/* Step 3: Academic Information */}
            {currentStep === 3 && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Academic Information</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="cgpa">Current CGPA *</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    min="2.00"
                    max="5.00"
                    value={applicationData.cgpa}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, cgpa: e.target.value }))}
                    placeholder="4.50"
                  />
                  {validationErrors.cgpa && <p className="text-sm text-destructive">{validationErrors.cgpa}</p>}
                  <p className="text-xs text-muted-foreground">
                    Enter your current CGPA (2.00 - 5.00). Must meet position requirements.
                  </p>
                  
                  {selectedPosition && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm">
                        <strong>Position Requirement:</strong> Minimum CGPA of {selectedPosition.min_cgpa} for {selectedPosition.name} 
                         and eligible for levels: {selectedPosition.eligible_levels.map(l => `${l}L`).join(', ')}
                      </p>
                      {applicationData.cgpa && parseFloat(applicationData.cgpa) >= selectedPosition.min_cgpa && (
                        <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">CGPA requirement met</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Academic Requirements:</p>
                      <ul className="text-blue-800 dark:text-blue-400 space-y-1">
                        <li>• Your most recent statement of result showing CGPA will be submitted on screening day</li>
                        <li>• Ensure your CGPA meets the minimum requirement for your chosen position</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Step 4: Leadership Experience */}
            {currentStep === 4 && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Leadership Experience</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="leadership_history">Leadership History *</Label>
                  <Textarea
                    id="leadership_history"
                    value={applicationData.leadership_history}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, leadership_history: e.target.value }))}
                    placeholder="Describe your leadership experience, positions held, achievements, and how they prepare you for this role..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum 20 words required</span>
                    <span>{applicationData.leadership_history.trim().split(/\s+/).length} words</span>
                  </div>
                  {validationErrors.leadership_history && <p className="text-sm text-destructive">{validationErrors.leadership_history}</p>}
                </div>

                <Card className="p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-300 mb-1">Required Documents for Screening Day:</p>
                      <ul className="text-amber-800 dark:text-amber-400 space-y-1">
                        <li>• Referee form completed and signed by academic staff</li>
                        <li>• Contact Nunsa Cafe for a copy of Referee Form if download fail</li>
                        <li>• Results of Last Academic Semester showing Current CGPA</li>
                        <li>• Certifactes of Leadership or documents proof of leadership experience</li>
                      </ul>
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                           <button
                                          onClick={handleDownload}
                                          className="flex items-center justify-center space-x-2 bg-background border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 py-3 rounded-2xl font-semibold transition-colors h-12"
                                        >
                                          <Download className="h-5 w-5" />
                                          <span>Download Referee Form</span>
                                        </button>
                          <Button variant="outline" size="sm" onClick={openWhatsApp} className="gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Contact NUNSA Café
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Step 5: Payment Proof */}
            {currentStep === 5 && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Payment Proof</h2>
                  <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                    <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">Payment Instructions</h3>
                    <div className="text-sm text-green-800 dark:text-green-400 space-y-1">
                     
                      <p><strong>Account Number:</strong> 9129196214 </p>
                      <p><strong>Bank:</strong> MONIEPOINT </p>
                      <p><strong>Account Name:</strong> Musa Zulaihat Dalhatu </p>
                    </div>
                  </Card>
                <div className="space-y-2">
                  <Label htmlFor="payment_proof" className="flex items-center gap-1">
                    Upload Payment Proof *
                    {applicationData.paymentProofUploaded && (
                      <CheckCircle2 className="w-4 h-4 text-green-600 ml-2" />
                    )}
                  </Label>
                  <Input
                    id="payment_proof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload('payment_proof', e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {validationErrors.payment_proof && <p className="text-sm text-destructive">{validationErrors.payment_proof}</p>}
                  
                  {/* Show file preview if available */}
                  {(applicationData.payment_proof || applicationData.paymentProofUploaded) && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">
                        ✓ File uploaded: {applicationData.payment_proof?.name || "Previously uploaded file"}
                      </p>
                    </div>
                  )}
                  
                  {applicationData.paymentProofUploaded && !applicationData.payment_proof && (
                    <p className="text-sm text-amber-600">⚠️ Payment proof was uploaded previously. Re-upload for final submission.</p>
                  )}
                  {selectedPosition && (
                  <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                    <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">Payment Instructions</h3>
                    <div className="text-sm text-green-800 dark:text-green-400 space-y-1">
                      <p><strong>Amount:</strong> ₦{selectedPosition.application_fee.toLocaleString()}</p>
                      <p><strong>Account Number:</strong> 9129196214 </p>
                      <p><strong>Bank:</strong> MONIEPOINT </p>
                      <p><strong>Account Name:</strong> Musa Zulaihat Dalhatu </p>
                    </div>
                  </Card>
                )}
                </div>
                <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-border"></div>
      <span className="text-muted-foreground font-medium">OR</span>
      <div className="flex-1 h-px bg-border"></div>
    </div>

    {/* Option 2: Send via WhatsApp */}
    <div className="space-y-4">
      <Label className="text-lg font-semibold">
        Option 2: Send Proof to IELCOM Treasurer on WhatsApp
      </Label>
      <Card className="p-5 bg-blue-50 border border-blue-300">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-medium">Treasurer Contact:</p>
            <p className="text-2xl font-bold text-primary">0912 919 6214</p>
            <p className="text-sm text-muted-foreground mt-1">Click button → Attach proof → Send</p>
          </div>
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
            onClick={() => {
              const positionName = selectedPosition?.name || "Aspirant Position";
              const message = `Attached is my proof of payment for the position of *${positionName}*.\n\nMatric No: *${applicationData.matric || "N/A"}*\nFull Name: *${applicationData.full_name || "N/A"}*`;
              const whatsappUrl = `https://wa.me/2349129196214?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, "_blank");
            }}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Send Proof on WhatsApp
          </Button>
        </div>
      </Card>
    </div>
    <Card className="p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-300 mb-1">Payment Guidelines:</p>
                      <ul className="text-amber-800 dark:text-amber-400 space-y-1">
                        <li>• Contact Treasurer on whatsapp: +234 912 919 6214 before making payment</li>
                        <li>• Upload screenshot or receipt of payment (Image/PDF, max 2MB)</li>
                        <li>• Ensure the payment amount matches the application fee exactly</li>
                        <li>• Include your name and matric number in the payment reference if possible</li>
                      </ul>
                    </div>
                  </div>
                </Card>
                 {/* Image Upload and Preview */}
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 p-4 border rounded-lg bg-muted/10">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-primary/30 flex-shrink-0 bg-muted flex items-center justify-center shadow-inner">
                    {applicationData.photo ? (
                      <img 
                        src={URL.createObjectURL(applicationData.photo)} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : applicationData.photoPreviewUrl ? (
                      <img 
                        src={applicationData.photoPreviewUrl} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2 flex-grow w-full">
                    <Label htmlFor="photo" className="flex items-center gap-1">
                      <Upload className="w-4 h-4"/> Profile Photo *
                      {applicationData.photoUploaded && (
                        <CheckCircle2 className="w-4 h-4 text-green-600 ml-2" />
                      )}
                    </Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => handleFileUpload('photo', e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {validationErrors.photo && <p className="text-sm text-destructive">{validationErrors.photo}</p>}
                    {applicationData.photoUploaded && !applicationData.photo && (
                      <p className="text-sm text-amber-600">⚠️ Photo was uploaded previously. Re-upload for final submission.</p>
                    )}
                    <p className="text-xs text-muted-foreground">JPG/PNG only, max 1MB. Must be clear headshot.</p>
                  </div>
                </div>

                
              </div>
            )}

            {/* Step 6: Review & Final Confirmation */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-primary"/> Final Review & Confirmation
                </h2>
                <p className="text-muted-foreground text-sm">
                  Please review all your details carefully. You cannot edit this information after submission.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section: Personal Details */}
                    <ReviewSection title="1. Personal Information">
                      {/* Photo Preview */}
                      <div className="flex flex-col items-center py-2 mb-2 border-b">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/50 flex-shrink-0 bg-muted flex items-center justify-center shadow-md">
                          {applicationData.photo ? (
                            <img src={URL.createObjectURL(applicationData.photo)} alt="Profile Preview" className="w-full h-full object-cover" />
                          ) : applicationData.photoPreviewUrl ? (
                            <img src={applicationData.photoPreviewUrl} alt="Profile Preview" className="w-full h-full object-cover" />
                          ) : <User className="w-10 h-10 text-muted-foreground" />}
                        </div>
                        <span className="text-sm font-semibold mt-2">{applicationData.full_name || 'N/A'}</span>
                      </div>
                      
                      <ReviewItem label="Matric Number" value={applicationData.matric} />
                      <ReviewItem label="Department" value={applicationData.department} />
                      <ReviewItem label="Level" value={applicationData.level} />
                      <ReviewItem label="Date of Birth" value={applicationData.dob} />
                      <ReviewItem label="Gender" value={applicationData.gender} />
                      <ReviewItem label="Phone Number" value={applicationData.phone} />
                      <ReviewItem label="Email" value={applicationData.email} />
                    </ReviewSection>

                    {/* Section: Position Details */}
                    <ReviewSection title="2. Position & Motivation">
                      <ReviewItem label="Position Applied" value={selectedPosition?.name} />
                      <ReviewItem label="Application Fee" value={selectedPosition?.application_fee} />
                      <ReviewItem label="Motivation (Words)" value={applicationData.why_running.trim().split(/\s+/).length} />
                      {/* Why running preview for quick check */}
                      <div className="pt-2 text-xs text-muted-foreground italic border-t mt-2">
                        Snippet: "{applicationData.why_running.substring(0, 100)}..."
                      </div>
                    </ReviewSection>

                    {/* Section: Academic Details */}
                    <ReviewSection title="3. Academic Information">
                      <ReviewItem label="Current CGPA" value={applicationData.cgpa} />
                      <ReviewItem label="Position Min CGPA" value={selectedPosition?.min_cgpa} />
                    </ReviewSection>

                    {/* Section: Leadership/Payment */}
                    <div className="space-y-4">
                        <ReviewSection title="4. Leadership Experience">
                            <ReviewItem label="History (Words)" value={applicationData.leadership_history.trim().split(/\s+/).length} />
                             <div className="pt-2 text-xs text-muted-foreground italic border-t mt-2">
                                Snippet: "{applicationData.leadership_history.substring(0, 100)}..."
                              </div>
                        </ReviewSection>
                        <ReviewSection title="5. Payment Proof">
                            <ReviewItem label="Payment Proof" value={applicationData.payment_proof?.name || (applicationData.paymentProofUploaded ? "Previously uploaded" : null)} isFile={true} />
                            <p className="text-xs text-muted-foreground italic mt-2">
                                File: {applicationData.payment_proof?.name || (applicationData.paymentProofUploaded ? "Previously uploaded file" : 'No file selected')}
                            </p>
                        </ReviewSection>
                    </div>
                </div>

                {/* Final Declaration Card */}
                <Card className="p-4 sm:p-6 border-2 border-red-500/50 bg-red-50/50 dark:bg-red-900/10 shadow-xl">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Lock className="w-5 h-5"/>DECLARATION & AGREEMENT
                  </h3>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4">
                    
                    {/* DECLARATION STATEMENT */}
                    <p className="font-semibold text-base mb-2">Declaration Statement:</p>
                    <p className="italic">
                      I, {applicationData.full_name}, hereby declare that all the information provided in this form is accurate to the best of my knowledge. 
                      I understand that any false information may lead to my disqualification from the election. I agree to adhere to the rules and regulations set forth by the NUNSA Electoral Committee.
                    </p>

                    {/* RULES AND REQUIREMENTS CHECK BUTTON (LIST) */}
                    <div className="mt-4 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <p className="font-semibold text-base mb-2 text-yellow-800 dark:text-yellow-400">RULES AND REQUIREMENTS CHECK:</p>
                      <ul className="list-disc pl-5 space-y-1 text-yellow-700 dark:text-yellow-300">
                        <li>All Contestants must be bona-fide students of Al-Hikmah University Nursing Department.</li> 
                        <li>All contestants found guilty of examinations malpractice or any act of indecency with concrete evidence aren't eligible to contest.</li> 
                        <li>Attach a copy of the payment receipt for the Association Fee for 2025/2026 Academic Session.</li> 
                        <li>Attach proof of academic standing. (Copy of Academic Transcript/Result Slip)</li> 
                        <li>Attach a copy of the payment receipt for the nomination form.</li> 
                      </ul>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-2">Note; inability to meet with any of the above rules and requirements shall disqualify the contestant.</p>
                    </div>

                    {/* DECLARATION OF ACCEPTANCE OF ELECTION RESULTS */}
                    <p className="font-semibold text-base mt-4 mb-2">Declaration of Acceptance of Election Results:</p>
                    <p>
                      By submitting this form, I, {applicationData.full_name}, hereby declare that:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 font-medium">
                      <li>I fully understand and agree to abide by the rules and guidelines set forth by the NUNSA Electoral Committee.</li>
                      <li>I will respect the outcome of the election, as determined by a free and fair voting process, and will not contest the results through any form of violence, argument, or disruption.</li>
                      <li>I commit to maintaining peace, order, and unity throughout the campaign and post-election periods.</li>
                      <li>Should I lose the election, I will graciously accept the result and cooperate with the winning candidates to promote the success of the association.</li>
                    </ol>

                    <div className="flex items-start mt-5 p-3 border rounded-lg bg-white dark:bg-gray-800">
                      <input 
                        type="checkbox" 
                        id="final-confirmation"
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                        className="mt-1 w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary/50 cursor-pointer"
                      />
                      <Label htmlFor="final-confirmation" className="ml-3 text-sm font-medium text-foreground cursor-pointer">
                        I have reviewed the summary and agree to the above declaration.
                      </Label>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-6 sm:pt-8 border-t mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                {currentStep < TOTAL_STEPS - 1 && (
                    <Button
                      variant="outline"
                      onClick={() => saveProgress(currentStep)}
                      disabled={isSaving}
                      className="gap-2 flex-shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </Button>
                )}

                {currentStep < TOTAL_STEPS ? (
                  <Button onClick={handleNext} className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto">
                    {currentStep === TOTAL_STEPS - 1 ? "Review Application" : "Next"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmitApplication}
                    disabled={isSubmitting || !isConfirmed}
                    className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Application
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Back to Dashboard */}
          <div className="text-center mt-6 sm:mt-8">
            <Button variant="ghost" onClick={() => navigate("/aspirant")} className="gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Back to Aspirant Dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AspirantApplication;                                            