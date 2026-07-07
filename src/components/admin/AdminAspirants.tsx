import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Eye, CheckCircle2, XCircle, Clock, Calendar, UserCheck, Download, TrophyIcon, Image, CreditCard, Search, Filter, AlertCircle, Edit, Trash2, Save, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// NEW HELPER FUNCTION: Safely formats a date string for display
// Now includes an option to omit the time.
const formatDisplayDate = (dateString: string | null | undefined, includeTime = true): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        // Only include hour and minute if includeTime is true
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
};

// NEW HELPER FUNCTION: Generates a WhatsApp deep link
const generateWhatsappLink = (phone: string, message: string): string => {
    // Format phone to a clean standard (e.g., removing non-digits and ensuring country code or leading 234)
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '234');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

// HELPER FUNCTION: Get status badge variant and custom Tailwind class for color.
const getStatusBadge = (status: string) => {
    switch (status) {
        // Pending: Uses default variant with a custom yellow color class
        case "pending": return { text: "Pending Payment", variant: "default" as const, icon: <Clock className="w-3 h-3 mr-1" />, className: "bg-yellow-500/10 text-yellow-600 border-yellow-300" };
        // Payment Verified: Uses secondary variant with a custom indigo color class
        case "payment_verified": return { text: "Payment Verified", variant: "secondary" as const, icon: <CreditCard className="w-3 h-3 mr-1" />, className: "bg-indigo-500/10 text-indigo-600 border-indigo-300" };
        // Under Review: Uses outline variant with a custom blue color class
        case "under_review": return { text: "Under Review", variant: "outline" as const, icon: <UserCheck className="w-3 h-3 mr-1" />, className: "text-blue-600 border-blue-300" };
        // Screening Scheduled: Uses default variant with a custom blue color class
        case "screening_scheduled": return { text: "Screening Scheduled", variant: "default" as const, icon: <Calendar className="w-3 h-3 mr-1" />, className: "bg-blue-500/10 text-blue-600 border-blue-300" };
        // Qualified: Uses default variant with a custom green color class (Success)
        case "qualified": return { text: "Qualified", variant: "default" as const, icon: <CheckCircle2 className="w-3 h-3 mr-1" />, className: "bg-green-500/10 text-green-700 border-green-300" };
        // Disqualified/Rejected: Uses destructive variant
        case "disqualified": return { text: "Disqualified", variant: "destructive" as const, icon: <XCircle className="w-3 h-3 mr-1" />, className: "" };
        case "rejected": return { text: "Rejected", variant: "destructive" as const, icon: <XCircle className="w-3 h-3 mr-1" />, className: "" };
        // Conditional: Uses outline variant with a custom orange color class (Warning)
        case "conditional_acceptance": return { text: "Conditional", variant: "outline" as const, icon: <AlertCircle className="w-3 h-3 mr-1" />, className: "bg-orange-500/10 text-orange-600 border-orange-300" };
        // Promoted: Uses default variant with a custom purple color class
        case "promoted_to_candidate": return { text: "Candidate", variant: "default" as const, icon: <UserCheck className="w-3 h-3 mr-1" />, className: "bg-purple-500/10 text-purple-700 border-purple-300" };
        default: return { text: status, variant: "secondary" as const, icon: null, className: "" };
    }
};

interface Aspirant {
  id: string;
  full_name: string;
  matric: string;
  email: string;
  phone: string;
  department: string;
  level: string;
  date_of_birth: string; // Stored as a date string, e.g., '1990-11-14'
  gender: string;
  cgpa: number;
  position_id: string; // Crucial for the promotion fix
  why_running: string;
  leadership_history: string;
  photo_url: string | null;
  payment_proof_url: string | null;
  payment_verified: boolean;
  status: string;
  admin_review_status: string;
  admin_review_notes: string | null;
  screening_scheduled_at: string | null;
  screening_result: string | null;
  screening_notes: string | null;
  conditional_acceptance: boolean;
  conditional_reason: string | null;
  resubmission_deadline: string | null;
  promoted_to_candidate: boolean;
  promoted_at: string | null;
  candidate_id: string | null;
  created_at: string;
  updated_at: string;
  aspirant_positions: { name: string; application_fee: number } | null;
}

interface AspirantStats {
  total_applications: number;
  pending_payment: number;
  payment_verified: number;
  under_review: number;
  approved: number;
  rejected: number;
  screening_scheduled: number;
  qualified: number;
  disqualified: number;
  promoted_to_candidate: number;
  by_position: Record<string, number>;
}

export function AdminAspirants() {
  const [aspirants, setAspirants] = useState<Aspirant[]>([]);
  const [filteredAspirants, setFilteredAspirants] = useState<Aspirant[]>([]);
  const [stats, setStats] = useState<AspirantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedAspirant, setSelectedAspirant] = useState<Aspirant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // FIX: Move Tab state to the parent component to persist across re-renders
  const [activeDialogTab, setActiveDialogTab] = useState("info"); 

  const [actionData, setActionData] = useState({
    payment_verified: false,
    admin_review_status: "",
    admin_review_notes: "",
    screening_scheduled_at: "",
    screening_result: "",
    screening_notes: "",
    conditional_acceptance: false,
    conditional_reason: "",
    resubmission_deadline: "",
  });
  const { toast } = useToast();

  const fetchAspirants = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch data and statistics concurrently
      const [aspirantsResult, statsResult] = await Promise.all([
        supabase
          .from("aspirants")
          .select(
            `
            *,
            aspirant_positions (
              name,
              application_fee
            )
          `
          )
          .order("created_at", { ascending: false }),
        (supabase.rpc as any)("get_aspirant_statistics"),
      ]);

      if (aspirantsResult.error) throw aspirantsResult.error;
      if (statsResult.error) throw statsResult.error;

      setAspirants(aspirantsResult.data as Aspirant[]);
      setStats(statsResult.data as AspirantStats);

    } catch (error) {
      console.error("Error fetching aspirants:", error);
      toast({
        title: "Error",
        description: "Failed to fetch aspirant data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchAspirants();
  }, [fetchAspirants]);

  // Filtering Logic
  useEffect(() => {
    const filtered = aspirants.filter(aspirant => {
      // Search term filter
      const matchesSearch = searchTerm === "" ||
        aspirant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aspirant.matric.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aspirant.aspirant_positions?.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter logic
      let status;
      if (aspirant.promoted_to_candidate) {
          status = "promoted";
      } else if (aspirant.screening_result) {
          status = aspirant.screening_result;
      } else if (aspirant.screening_scheduled_at) {
          status = "screening_scheduled";
      } else if (aspirant.admin_review_status === "rejected" || aspirant.screening_result === "disqualified") {
          status = "rejected";
      } else if (aspirant.payment_verified) {
          status = "payment_verified";
      } else {
          status = "pending";
      }
      
      const matchesStatus = statusFilter === "all" || statusFilter === status;

      return matchesSearch && matchesStatus;
    });

    setFilteredAspirants(filtered);
  }, [aspirants, searchTerm, statusFilter]);

  // Handle Dialog Open
  const handleOpenDialog = (aspirant: Aspirant) => {
    setSelectedAspirant(aspirant);
    setActionData({
      payment_verified: aspirant.payment_verified,
      admin_review_status: aspirant.admin_review_status || "",
      admin_review_notes: aspirant.admin_review_notes || "",
      screening_scheduled_at: aspirant.screening_scheduled_at ? new Date(aspirant.screening_scheduled_at).toISOString().slice(0, 16) : "",
      screening_result: aspirant.screening_result || "",
      screening_notes: aspirant.screening_notes || "",
      conditional_acceptance: aspirant.conditional_acceptance,
      conditional_reason: aspirant.conditional_reason || "",
      resubmission_deadline: aspirant.resubmission_deadline ? new Date(aspirant.resubmission_deadline).toISOString().slice(0, 16) : "",
    });
    // FIX: Set the tab back to info when opening a new aspirant's dialog
    setActiveDialogTab("info"); 
    setIsDialogOpen(true);
  };

  // Handle Aspirant Update (Admin Review)
  const handleUpdateAspirant = async () => {
    if (!selectedAspirant) return;
    setUpdating(true);

    let newStatus = selectedAspirant.status;

    // Logic to derive the new 'status' field based on admin actions
    if (actionData.admin_review_status === "rejected") {
        newStatus = "rejected";
    } else if (actionData.conditional_acceptance) {
        newStatus = "conditional_acceptance";
    } else if (actionData.screening_result === "qualified" || actionData.screening_result === "disqualified") {
        newStatus = actionData.screening_result;
    } else if (actionData.screening_scheduled_at) {
        newStatus = "screening_scheduled";
    } else if (actionData.payment_verified) {
        newStatus = "payment_verified";
    } else {
        newStatus = "pending";
    }

    try {
      const updateData = {
        payment_verified: actionData.payment_verified,
        admin_review_status: actionData.admin_review_status,
        admin_review_notes: actionData.admin_review_notes || null,
        screening_scheduled_at: actionData.screening_scheduled_at || null,
        screening_result: actionData.screening_result || null,
        screening_notes: actionData.screening_notes || null,
        conditional_acceptance: actionData.conditional_acceptance,
        conditional_reason: actionData.conditional_reason || null,
        resubmission_deadline: actionData.resubmission_deadline || null,
        status: newStatus, // Update the status column
      };

      const { error } = await supabase
        .from("aspirants")
        .update(updateData)
        .eq("id", selectedAspirant.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedAspirant.full_name}'s application updated.`,
      });
      fetchAspirants();
      // Dialog Fix: The dialog state is intentionally NOT set to false here,
      // allowing the user to make multiple changes before closing manually.

    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Could not update the aspirant record.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const promoteToCandidate = async (aspirant: Aspirant) => {
    if (aspirant.status !== 'qualified' && aspirant.screening_result !== 'qualified') {
        toast({
            title: "Action Restricted",
            description: "Only 'Qualified' aspirants can be promoted to Candidate.",
            variant: "default", 
        });
        return;
    }

    if (!confirm(`Are you sure you want to promote ${aspirant.full_name} to a Candidate? This action cannot be undone.`)) return;

    setUpdating(true);
    try {
      // 1. Create a record in the 'candidates' table
      const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .insert({
          full_name: aspirant.full_name,
          // FIX: The 'matric' column is NOT in your 'public.candidates' table. 
          // Removed from the insertion payload to prevent the "Promotion Failed" error.
          position: aspirant.aspirant_positions?.name || "Unknown Position", // Needs position NAME (text)
          picture_url: aspirant.photo_url,
          manifesto: aspirant.why_running || null, 
        })
        .select()
        .single();

      if (candidateError) {
        console.error("Candidate creation error:", candidateError);
        throw new Error(candidateError.message || "Failed to insert candidate record.");
      }

      // 2. Update the aspirant record
      const { error: updateError } = await supabase
        .from("aspirants")
        .update({
          promoted_to_candidate: true,
          promoted_at: new Date().toISOString(),
          candidate_id: candidate.id, // Link to the new candidate record
          status: "promoted_to_candidate",
        })
        .eq("id", aspirant.id);

      if (updateError) {
        console.error("Aspirant update error after promotion:", updateError);
        // It's crucial to still show success if candidate was created, 
        // but log the secondary error.
      }

      toast({
        title: "Promotion Successful",
        description: `${aspirant.full_name} has been promoted to a Candidate.`,
        variant: "default", 
      });
      fetchAspirants();
      // Close the dialog after the successful promotion action
      setIsDialogOpen(false); 

    } catch (error) {
      console.error("Promotion error:", error);
      toast({
        title: "Promotion Failed",
        description: `Failed to promote aspirant to candidate. Error: ${error instanceof Error ? error.message : "An unknown error occurred."}`,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };


  // --- Render Functions ---

  const renderStatsCard = (title: string, count: number, icon: React.ReactNode) => (
    <Card className="shadow-sm transition-all hover:shadow-md">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  );

  const DocumentLink = ({ title, url, icon, viewFullOption = false }: { title: string; url: string | null; icon: React.ReactNode; viewFullOption?: boolean }) => (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      {url ? (
        <Button
          variant={viewFullOption ? "default" : "outline"}
          size="sm"
          onClick={() => window.open(url, '_blank')}
        >
          <Eye className="w-4 h-4 mr-1" />
          
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">Not Uploaded</span>
      )}
    </div>
  );

  const AspirantDetailsDialog = ({ aspirant, activeTab, setActiveTab }: { aspirant: Aspirant, activeTab: string, setActiveTab: (tab: string) => void }) => {
    // FIX: Removed local state, now using controlled props from parent
    
    const currentStatus = aspirant.promoted_to_candidate ? "promoted_to_candidate"
        : aspirant.screening_result ? aspirant.screening_result
        : aspirant.screening_scheduled_at ? "screening_scheduled"
        : aspirant.conditional_acceptance ? "conditional_acceptance"
        : aspirant.payment_verified ? "payment_verified"
        : "pending";

    const statusInfo = getStatusBadge(currentStatus);

    // WhatsApp Message Logic
    const scheduledDate = actionData.screening_scheduled_at ? formatDisplayDate(actionData.screening_scheduled_at, false) : "[Date]";
    const scheduledTime = actionData.screening_scheduled_at ? new Date(actionData.screening_scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : "[Time]";

    const schedulingMessage = `Dear ${aspirant.full_name}, your screening for the position of ${aspirant.aspirant_positions?.name} has been scheduled.
Date: ${scheduledDate}
Time: ${scheduledTime}
Venue: [Specify Venue, e.g., NUNSA Secretariat]
Please prepare all required documents and be punctual.`;
    const schedulingLink = generateWhatsappLink(aspirant.phone, schedulingMessage);

    const qualifiedMessage = `Congratulations ${aspirant.full_name}, your screening for the position of ${aspirant.aspirant_positions?.name} was successful! You have been qualified to proceed as a candidate.`;
    const qualifiedLink = generateWhatsappLink(aspirant.phone, qualifiedMessage);

    const disqualifiedMessage = `Dear ${aspirant.full_name}, we regret to inform you that your screening for the position of ${aspirant.aspirant_positions?.name} was unsuccessful. You have been disqualified. Review notes: ${actionData.screening_notes || 'N/A'}`;
    const disqualifiedLink = generateWhatsappLink(aspirant.phone, disqualifiedMessage);

    const rescreeningMessage = `Dear ${aspirant.full_name}, your screening for the position of ${aspirant.aspirant_positions?.name} requires a re-screening due to [Reason for re-screening, e.g., missing document, panel request]. Please contact the Electoral Committee on [Electoral Committee Phone No.] to reschedule as soon as possible.`;
    const rescreeningLink = generateWhatsappLink(aspirant.phone, rescreeningMessage);


    return (
      <DialogContent className="sm:max-w-[425px] lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Application Review
          <Badge variant={statusInfo.variant} className={`w-fit mt-2 ${statusInfo.className}`}>
            {statusInfo.icon} {statusInfo.text}
          </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs 
            // FIX: Use controlled value and setter from the parent AdminAspirants component
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full mt-4"
        >
          <TabsList className="grid w-full grid-cols-1 lg:grid-cols-3 h-auto">
            <TabsTrigger value="info">Applicant Info</TabsTrigger> {/* 1st Tab: Applicant Info */}
            <TabsTrigger value="review">Admin Review</TabsTrigger> {/* 2nd Tab: Admin Review */}
            <TabsTrigger value="screening">Screening</TabsTrigger> {/* 3rd Tab: Screening */}
          </TabsList>

          {/* --- TAB 1: Applicant Info --- */}
          <TabsContent value="info" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal & Academic Info</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                {/* Aspirant Photo (New Requirement) */}
                <div className="md:col-span-1 space-y-2">
                    <h4 className="font-semibold text-base">Aspirant Photo</h4>
                    {aspirant.photo_url ? (
                        <div className="aspect-square w-full max-w-[200px] border rounded-md overflow-hidden">
                            <img
                                src={aspirant.photo_url}
                                alt={`${aspirant.full_name}'s photo`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : ( 
                        <div className="aspect-square w-full max-w-[200px] border rounded-md flex items-center justify-center text-muted-foreground">
                            <Image className="w-8 h-8" />
                        </div>
                    )}
                    
                        <DocumentLink
                            title="View Full Photo"
                            url={aspirant.photo_url}
                            icon={<Eye className="w-5 h-5" />}
                            viewFullOption={true} // View full picture option
                    />
                </div>

                {/* Personal Details */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p><strong>Full Name:</strong> {aspirant.full_name}</p>
                        <p><strong>Matric Number:</strong> {aspirant.matric}</p>
                        <p><strong>Level:</strong> {aspirant.level}</p>
                        <p><strong>Department:</strong> {aspirant.department}</p>
                        <p><strong>CGPA:</strong> <Badge variant="outline">{aspirant.cgpa?.toFixed(2)}</Badge></p>
                        <p><strong>Position:</strong> {aspirant.aspirant_positions?.name}</p>
                    </div>
                    <div className="space-y-2">
                        <p><strong>Email:</strong> {aspirant.email}</p>
                        <p><strong>Phone:</strong> {aspirant.phone}</p>
                        {/* DoB Format: day, month, and year (New Requirement) */}
                        <p><strong>Date of Birth:</strong> {formatDisplayDate(aspirant.date_of_birth, false)}</p> 
                        <p><strong>Gender:</strong> {aspirant.gender}</p>
                        <p><strong>Applied On:</strong> {formatDisplayDate(aspirant.created_at)}</p>
                        <p><strong>Status:</strong> {aspirant.status}</p>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-4 mt-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-base border-b pb-1">Why Running?</h4>
                        <p className="text-muted-foreground italic whitespace-pre-wrap">{aspirant.why_running}</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold text-base border-b pb-1">Leadership History</h4>
                        <p className="text-muted-foreground italic whitespace-pre-wrap">{aspirant.leadership_history}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- TAB 2: Admin Review (Including Payment Proof) --- */}
          <TabsContent value="review" className="mt-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Payment & Initial Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Payment Proof Document (New Requirement) */}
                    <div className="space-y-2 pb-4 border-b">
                        <h4 className="font-semibold text-base">Payment Proof Document</h4>
                        <DocumentLink
                            title="Proof of Application Fee Payment"
                            url={aspirant.payment_proof_url}
                            icon={<CreditCard className="w-5 h-5" />}
                            viewFullOption={true} // View full picture option
                        />
                    </div>
                    
                    {/* Payment Verification Switch */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <Label htmlFor="payment_verified" className="flex items-center gap-2 text-sm font-medium">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            Verify Application Fee Payment (₦{aspirant.aspirant_positions?.application_fee?.toLocaleString() || 'N/A'})
                        </Label>
                        <Switch
                            id="payment_verified"
                            checked={actionData.payment_verified}
                            onCheckedChange={(v) => setActionData({ ...actionData, payment_verified: v })}
                            disabled={aspirant.promoted_to_candidate}
                        />
                    </div>

                    {/* Admin Review Status */}
                    <div className="space-y-2">
                        <Label htmlFor="admin_review_status">Admin Review Status</Label>
                        <Select
                            value={actionData.admin_review_status}
                            onValueChange={(v) => setActionData({ ...actionData, admin_review_status: v, conditional_acceptance: v === 'conditional_acceptance' })}
                            disabled={aspirant.promoted_to_candidate}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="approved">Approved for Screening</SelectItem>
                                <SelectItem value="conditional_acceptance">Conditional Acceptance</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="admin_review_notes">Admin Notes</Label>
                        <Textarea
                            id="admin_review_notes"
                            value={actionData.admin_review_notes || ''}
                            // FIX: Use the parent's setter to update actionData
                            onChange={(e) => setActionData({ ...actionData, admin_review_notes: e.target.value })}
                            placeholder="Enter notes for the aspirant..."
                            rows={3}
                            disabled={aspirant.promoted_to_candidate}
                        />
                    </div>

                    {/* Conditional fields for Conditional Acceptance */}
                    {(actionData.admin_review_status === "conditional_acceptance" || actionData.conditional_acceptance) && (
                        <div className="space-y-4 border-t pt-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Conditional Acceptance Details</AlertTitle>
                                <AlertDescription>
                                    Require the aspirant to resubmit certain documents or correct information.
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label htmlFor="conditional_reason">Conditional Reason *</Label>
                                <Textarea
                                    id="conditional_reason"
                                    value={actionData.conditional_reason || ''}
                                    // FIX: Use the parent's setter to update actionData
                                    onChange={(e) => setActionData({ ...actionData, conditional_reason: e.target.value })}
                                    placeholder="Explain what needs to be resubmitted..."
                                    rows={3}
                                    required
                                    disabled={aspirant.promoted_to_candidate}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="resubmission_deadline">Resubmission Deadline</Label>
                                <Input
                                    id="resubmission_deadline"
                                    type="datetime-local"
                                    value={actionData.resubmission_deadline}
                                    // FIX: Use the parent's setter to update actionData
                                    onChange={(e) => setActionData({ ...actionData, resubmission_deadline: e.target.value })}
                                    disabled={aspirant.promoted_to_candidate}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          {/* --- TAB 3: Screening --- */}
          <TabsContent value="screening" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Screening Details & Communication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="screening_scheduled_at">Screening Date & Time</Label>
                  <Input
                    id="screening_scheduled_at"
                    type="datetime-local"
                    value={actionData.screening_scheduled_at}
                    // FIX: Use the parent's setter to update actionData
                    onChange={(e) => setActionData({ ...actionData, screening_scheduled_at: e.target.value })}
                    disabled={aspirant.promoted_to_candidate}
                  />
                  <p className="text-xs text-muted-foreground">If a time is set, the status becomes 'Screening Scheduled'.</p>
                  
                  {/* WhatsApp message for scheduling (New Requirement) */}
                  <Button
                    asChild
                    variant="link"
                    className="p-0 h-auto text-green-600 hover:text-green-700"
                    disabled={!actionData.screening_scheduled_at}
                  >
                    <a href={schedulingLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Send WhatsApp Message (Scheduled)
                    </a>
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="screening_result">Screening Result</Label>
                  <Select
                    value={actionData.screening_result}
                    // FIX: Use the parent's setter to update actionData
                    onValueChange={(v) => setActionData({ ...actionData, screening_result: v })}
                    disabled={aspirant.promoted_to_candidate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="disqualified">Disqualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screening_notes">Screening Notes (Internal)</Label>
                  <Textarea
                    id="screening_notes"
                    value={actionData.screening_notes || ''}
                    // FIX: Use the parent's setter to update actionData
                    onChange={(e) => setActionData({ ...actionData, screening_notes: e.target.value })}
                    placeholder="Enter notes from the screening panel..."
                    rows={3}
                    disabled={aspirant.promoted_to_candidate}
                  />
                </div>
                
                {/* WhatsApp message for results (New Requirement) */}
                <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
                    <Button
                        asChild
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        disabled={actionData.screening_result !== 'qualified'}
                    >
                        <a href={qualifiedLink} target="_blank" rel="noopener noreferrer">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            WhatsApp (Qualified)
                        </a>
                    </Button>
                    <Button
                        asChild
                        variant="destructive"
                        className="w-full sm:w-auto"
                        disabled={actionData.screening_result !== 'disqualified'}
                    >
                        <a href={disqualifiedLink} target="_blank" rel="noopener noreferrer">
                            <XCircle className="w-4 h-4 mr-1" />
                            WhatsApp (Disqualified)
                        </a>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="w-full sm:w-auto text-orange-600 border-orange-300"
                        disabled={!!actionData.screening_result} // Disable if a final result is set
                    >
                        <a href={rescreeningLink} target="_blank" rel="noopener noreferrer">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            WhatsApp (Require Re-screening)
                        </a>
                    </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <div className="flex flex-col sm:flex-row justify-between pt-4 border-t mt-6 gap-2">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Close
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
             <Button
                onClick={() => promoteToCandidate(aspirant)}
                disabled={updating || aspirant.promoted_to_candidate || aspirant.screening_result !== 'qualified'}
                variant="default"
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
                {aspirant.promoted_to_candidate ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                    <UserCheck className="w-4 h-4 mr-2" />
                )}
                {aspirant.promoted_to_candidate ? 'Promoted' : 'Promote to Candidate'}
            </Button>
            <Button
              onClick={handleUpdateAspirant}
              disabled={updating || aspirant.promoted_to_candidate}
              className="w-full sm:w-auto"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  };

  // ... (rest of the component remains the same)

  const totalApplications = stats?.total_applications || 0;
  const underReview = stats?.under_review || 0;
  const qualified = stats?.qualified || 0;
  const promoted = stats?.promoted_to_candidate || 0;
  const paymentVerified = stats?.payment_verified || 0;
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="text-left md:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center md:justify-start">
                  <TrophyIcon className="w-8 h-8 mr-3 text-blue-600" />
                  Aspirant Management
              </h1>
              <p className="text-lg text-gray-600">
                Track and review applications for all positions
              </p>
            </div>
     

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {renderStatsCard("Total Applications", totalApplications, <Download className="w-4 h-4 text-muted-foreground" />)}
        {renderStatsCard("Payment Verified", paymentVerified, <CreditCard className="w-4 h-4 text-green-600" />)}
        {renderStatsCard("Under Review", underReview, <Clock className="w-4 h-4 text-blue-600" />)}
        {renderStatsCard("Qualified", qualified, <CheckCircle2 className="w-4 h-4 text-green-600" />)}
        {renderStatsCard("Promoted (Candidates)", promoted, <UserCheck className="w-4 h-4 text-purple-600" />)}
      </div>

      {/* --- FILTER & SEARCH --- */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-grow max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, matric, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
          </div>
          
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Payment</SelectItem>
              <SelectItem value="payment_verified">Payment Verified</SelectItem>
              <SelectItem value="screening_scheduled">Screening Scheduled</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="disqualified">Disqualified</SelectItem>
              <SelectItem value="rejected">Rejected/Disqualified</SelectItem>
              <SelectItem value="promoted">Promoted to Candidate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* --- ASPIRANT LIST --- */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Loading aspirant applications...</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[70vh]">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                  <TableRow>
                    <TableHead className="min-w-[150px]">Applicant</TableHead>
                    <TableHead className="hidden sm:table-cell">Position</TableHead>
                    <TableHead className="hidden lg:table-cell">Matric / CGPA</TableHead>
                    <TableHead className="hidden md:table-cell">Applied On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAspirants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No aspirants matching the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAspirants.map((aspirant) => {
                      const statusInfo = getStatusBadge(aspirant.status);
                      const isPromoted = aspirant.promoted_to_candidate;

                      return (
                        <TableRow key={aspirant.id} className={isPromoted ? "bg-purple-50/50 hover:bg-purple-100/70" : ""}>
                          <TableCell>
                            <div className="font-semibold text-gray-800">{aspirant.full_name}</div>
                            <div className="sm:hidden text-xs text-muted-foreground"><p><strong>{aspirant.aspirant_positions?.name}</strong></p></div>
                            
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {aspirant.aspirant_positions?.name}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="font-mono text-xs">{aspirant.matric}</div>
                            <Badge variant="outline" className="mt-1">
                                CGPA: {aspirant.cgpa?.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {formatDisplayDate(aspirant.created_at, false)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant} className={`text-xs ${statusInfo.className}`}>
                              {statusInfo.icon}
                              {statusInfo.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog open={isDialogOpen && selectedAspirant?.id === aspirant.id} onOpenChange={setIsDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(aspirant)}
                                  aria-label={`View and review ${aspirant.full_name}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              {selectedAspirant && selectedAspirant.id === aspirant.id && (
                                <AspirantDetailsDialog 
                                    aspirant={selectedAspirant} 
                                    activeTab={activeDialogTab}
                                    setActiveTab={setActiveDialogTab}
                                />
                              )}
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}