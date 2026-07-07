import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Award, Trophy, Clock, Plus, Trash2, Loader2, Edit, User, Search, Filter, MoreVertical, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// --- Interfaces ---
interface Candidate {
  id: string;
  full_name: string;
  position: string; // CORRECTED: This is now the Position NAME (e.g., "President")
  picture_url: string | null;
  vote_count: number;
  created_at: string;
  manifesto: string | null;
}

interface Position {
  id: string;
  name: string;
  vote_type: string;
  max_selections: number;
}

interface Aspirant {
  id: string;
  full_name: string;
  photo_url: string | null;
  aspirant_positions: { name: string } | null;
  promoted_to_candidate: boolean;
  screening_result: string | null;
}

// --- Component ---
export function AdminCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [availableAspirants, setAvailableAspirants] = useState<Aspirant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // positionFilter will now hold the Position NAME or "all"
  const [positionFilter, setPositionFilter] = useState("all"); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    full_name: "",
    position: "", // Position NAME (e.g., "President")
    picture_url: "",
    aspirant_id: "",
    manifesto: "", 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // getPositionName helper is removed as candidate.position is already the name

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [candidatesResult, positionsResult, aspirantsResult] = await Promise.all([
        supabase.from("candidates").select("*").order("position"),
        supabase.from("positions").select("*").order("display_order"),
        supabase
          .from("aspirants")
          .select(`
            id,
            full_name,
            photo_url,
            promoted_to_candidate,
            screening_result,
            aspirant_positions (name)
          `)
          .eq("screening_result", "qualified")
          .eq("promoted_to_candidate", false),
      ]);

      if (candidatesResult.error) throw candidatesResult.error;
      if (positionsResult.error) throw positionsResult.error;
      if (aspirantsResult.error) throw aspirantsResult.error;

      setCandidates(candidatesResult.data as Candidate[] || []);
      setPositions(positionsResult.data as Position[] || []);
      setAvailableAspirants(aspirantsResult.data as unknown as Aspirant[] || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filtering & Pagination Logic ---

  const filteredCandidates = useMemo(() => {
    const filtered = candidates.filter(candidate => {
      // Use candidate.position directly as the name
      const positionName = candidate.position || '';
      
      const matchesSearch = candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          positionName.toLowerCase().includes(searchTerm.toLowerCase());
          
      // FIX: Filter logic now compares candidate.position (Name) with positionFilter (Name)
      const matchesPosition = positionFilter === "all" || candidate.position === positionFilter; 
      
      return matchesSearch && matchesPosition;
    });

    setCurrentPage(1); // Reset to first page on filter/search change
    return filtered;
    // Removed getPositionName dependency
  }, [candidates, searchTerm, positionFilter]); 

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // --- Form Handlers ---

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `candidate-${Date.now()}.${fileExt}`;
        const filePath = `candidates/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('aspirant-documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('aspirant-documents')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        toast({
            title: "Upload Failed",
            description: "Failed to upload candidate photo",
            variant: "destructive",
        });
        return null;
    } finally {
        setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true); // Reusing isUploading for form submission state

    try {
      let pictureUrl = formData.picture_url;

      // 1. Upload new image if selected
      if (imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile);
        if (uploadedUrl) {
          pictureUrl = uploadedUrl;
        } else {
          return; // Upload failed, exit
        }
      }

      // 2. Perform DB operation (Update or Insert)
      // NOTE: formData.position now correctly holds the Position NAME
      if (editingCandidate) {
        // Update Candidate
        const { error } = await supabase
          .from("candidates")
          .update({
            full_name: formData.full_name,
            position: formData.position, // Position NAME
            picture_url: pictureUrl || null,
            manifesto: formData.manifesto, 
          })
          .eq("id", editingCandidate.id);

        if (error) throw error;
        toast({ title: "Success", description: "Candidate updated successfully" });

      } else {
        // Create/Promote Candidate
        if (formData.aspirant_id) {
          // Promotion Flow
          const aspirant = availableAspirants.find(a => a.id === formData.aspirant_id);
          if (!aspirant || !formData.position) {
            throw new Error("Missing aspirant or position name for promotion.");
          }

          const { error: candidateError } = await supabase
            .from("candidates")
            .insert({
              full_name: aspirant.full_name,
              position: formData.position, // Position NAME
              picture_url: pictureUrl || aspirant.photo_url,
              manifesto: formData.manifesto, 
            });

          if (candidateError) throw candidateError;

          // Mark aspirant as promoted
          const { error: aspirantError } = await supabase
            .from("aspirants")
            .update({
              promoted_to_candidate: true,
              promoted_at: new Date().toISOString(),
            })
            .eq("id", formData.aspirant_id);

          if (aspirantError) throw aspirantError;

        } else {
          // Manual Creation Flow
          const { error } = await supabase
            .from("candidates")
            .insert({
              full_name: formData.full_name,
              position: formData.position, // Position NAME
              picture_url: pictureUrl || null,
              manifesto: formData.manifesto || null, 
            });

          if (error) throw error;
        }
        toast({ title: "Success", description: "Candidate added successfully" });
      }

      // 3. Cleanup and Refresh
      setIsDialogOpen(false);
      setEditingCandidate(null);
      setFormData({ full_name: "", position: "", picture_url: "", aspirant_id: "", manifesto: "" }); 
      setImageFile(null);
      fetchData();

    } catch (error) {
      console.error("Error saving candidate:", error);
      toast({
        title: "Error",
        description: `Failed to save candidate. ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) return;

    try {
      // Optimistic update
      setCandidates(c => c.filter(candidate => candidate.id !== id));

      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Candidate deleted successfully" });
      fetchData(); // Fetch to update Aspirant list too
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      full_name: candidate.full_name,
      position: candidate.position, // candidate.position is already the Name
      picture_url: candidate.picture_url || "",
      manifesto: candidate.manifesto || "", 
      aspirant_id: "", 
    });
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingCandidate(null);
    setFormData({ full_name: "", position: "", picture_url: "", aspirant_id: "", manifesto: "" }); 
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleAspirantSelect = (value: string) => {
    if (value === "manual-entry") {
      setFormData({ 
        full_name: "", 
        position: "", 
        picture_url: "", 
        aspirant_id: "", 
        manifesto: formData.manifesto 
      });
      return;
    }
    
    const aspirant = availableAspirants.find(a => a.id === value);
    if (aspirant) {
      // FIX: Get the Position NAME from the aspirant record
      const aspirantPositionName = aspirant.aspirant_positions?.name;

      setFormData(prev => ({
        ...prev,
        aspirant_id: value,
        full_name: aspirant.full_name,
        position: aspirantPositionName || "", // Set position to the NAME
        picture_url: aspirant.photo_url || "",
      }));
    }
  };

  // --- Helper Components for Rendering ---

  const CandidateActions = ({ candidate }: { candidate: Candidate }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => openEditDialog(candidate)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Candidate
        </DropdownMenuItem>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <FileText className="mr-2 h-4 w-4" />
              View Manifesto
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{candidate.full_name}'s Manifesto</DialogTitle>
              <DialogDescription>
                {/* FIX: Use candidate.position directly */}
                Position: {candidate.position}
              </DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap text-sm text-gray-700">
              {candidate.manifesto || "No manifesto provided."}
            </div>
          </DialogContent>
        </Dialog>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleDelete(candidate.id)}
          className="text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Candidate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const CandidateCard = ({ candidate }: { candidate: Candidate }) => (
    <Card className="shadow-sm border-2 transition hover:border-primary/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {candidate.picture_url ? (
                  <img src={candidate.picture_url} alt={candidate.full_name} className="w-full h-full object-cover" />
              ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-base font-semibold">{candidate.full_name}</CardTitle>
        </div>
        <CandidateActions candidate={candidate} />
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4 space-y-2 text-sm">
        <div className="flex justify-between">
            <span className="text-muted-foreground">Position:</span>
            {/* FIX: Use candidate.position directly */}
            <Badge variant="outline">{candidate.position}</Badge>
        </div>
        <div className="flex justify-between">
            <span className="text-muted-foreground">Votes:</span>
            <span className="font-bold text-primary">{candidate.vote_count}</span>
        </div>
        <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Added:</span>
            <span className="text-gray-500">{new Date(candidate.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Main Render ---

  return (
    <div className="space-y-4">
      {/* Header and Add Candidate Button */}
       <div className="text-left md:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center md:justify-start">
                  <Users className="w-8 h-8 mr-3 text-blue-600" />
                  Manage Candidates
              </h1>
            </div>
      <div className="justify-between items-start gap-4">
       
        {/* Add Candidate Button (Dialog Trigger) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="flex-shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCandidate ? "Edit Candidate" : "Add New Candidate"}</DialogTitle>
              <DialogDescription>
                {editingCandidate 
                  ? "Update candidate details, position, or photo."
                  : "Promote a qualified aspirant or manually create a new candidate."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Promotion / Manual Entry Toggle (Only for adding new candidates) */}
              {!editingCandidate && (
                <Card className="border-l-4 border-green-500 bg-green-50">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">Candidate Source</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <Select
                      value={formData.aspirant_id || "manual-entry"}
                      onValueChange={handleAspirantSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual-entry">Manual Entry (Fill form below)</SelectItem> 
                        {availableAspirants.map((aspirant) => (
                          <SelectItem key={aspirant.id} value={aspirant.id} className="font-medium">
                            {aspirant.full_name} - {aspirant.aspirant_positions?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.aspirant_id && (
                        <p className="text-xs text-green-600 mt-2">
                            * Promoting: Full Name, Position, and Photo will be pre-filled and locked.
                        </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* General Info Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                            disabled={!!formData.aspirant_id && !editingCandidate} 
                        />
                    </div>
                    <div>
                        <Label htmlFor="position">Position</Label>
                        <Select
                            value={formData.position}
                            onValueChange={(value) => setFormData({ ...formData, position: value })}
                            required
                            disabled={!!formData.aspirant_id && !editingCandidate} 
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                                {positions.map((pos) => (
                                    <SelectItem key={pos.id} value={pos.name}> 
                                        {pos.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="manifesto">Manifesto</Label>
                        <Textarea
                            id="manifesto"
                            value={formData.manifesto}
                            onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
                            placeholder="Enter candidate's manifesto here..."
                            rows={8}
                        />
                    </div>
                </div>
                
                {/* Photo Upload Column */}
                <div className="lg:col-span-1 space-y-4 border-l lg:pl-6">
                    <h4 className="font-semibold text-lg border-b pb-2">Photo</h4>
                    
                    {/* Photo Preview */}
                    {(formData.picture_url || imageFile) && (
                        <div className="flex flex-col items-center">
                            <Label className="mb-2">Photo Preview</Label>
                            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-primary/20 overflow-hidden">
                                {imageFile ? (
                                    <img
                                        src={URL.createObjectURL(imageFile)}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : formData.picture_url ? (
                                    <img
                                        src={formData.picture_url}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                ) : (
                                    <User className="w-10 h-10 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <Label htmlFor="picture_upload">Upload New Photo</Label>
                        <Input
                            id="picture_upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            disabled={!!formData.aspirant_id && !editingCandidate} 
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="picture_url">Picture URL (Direct Link)</Label>
                        <Input
                            id="picture_url"
                            type="url"
                            value={formData.picture_url}
                            // Set imageFile to null separately
                            onChange={(e) => {
                                setFormData({ ...formData, picture_url: e.target.value });
                                setImageFile(null); 
                            }}
                            placeholder="https://example.com/photo.jpg"
                            disabled={!!formData.aspirant_id && !editingCandidate} 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            A direct URL overrides the uploaded file.
                        </p>
                    </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t mt-6">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editingCandidate ? "Update" : "Add"} Candidate</>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            
           <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Positions</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Aspirants</CardTitle>
            <Trophy className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableAspirants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes Count</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidates.reduce((sum, c) => sum + c.vote_count, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <hr className="my-6" />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidate name or position..."
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page on search
            }}
            className="pl-10"
          />
        </div>
        <Select 
            value={positionFilter} 
            onValueChange={(value) => {
                setPositionFilter(value); // Now sets the Position NAME
                setCurrentPage(1); 
            }}
        >
          <SelectTrigger className="sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map((pos) => (
              // FIX: SelectItem value uses the Position NAME (pos.name)
              <SelectItem key={pos.id} value={pos.name}>
                {pos.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Card View (Visible on small screens) */}
      <div className="md:hidden space-y-3">
        {paginatedCandidates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
                No candidates found matching your criteria.
            </p>
        ) : (
            paginatedCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
            ))
        )}
      </div>

      {/* Desktop Table View (Visible on medium+ screens) */}
      <div className="hidden md:block border rounded-lg overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Candidate</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead className="text-right">Votes</TableHead>
              <TableHead className="w-[100px]">Added</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCandidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No candidates found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <div className="font-medium text-nowrap">{candidate.full_name}</div>
                  </TableCell>
                  <TableCell className="text-nowrap">
                    {/* FIX: Use candidate.position directly */}
                    <Badge variant="outline">{candidate.position}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border overflow-hidden">
                      {candidate.picture_url ? (
                        <img
                          src={candidate.picture_url}
                          alt={candidate.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-bold">
                        {candidate.vote_count.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground text-nowrap">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <CandidateActions candidate={candidate} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredCandidates.length > itemsPerPage && (
        <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of {filteredCandidates.length} candidates
            </p>
            <div className="flex gap-2 mx-auto sm:mx-0">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}