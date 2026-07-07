import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Edit, Calendar, LinkIcon, Palette, Clock } from "lucide-react"; // Added Clock icon
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card"; // Added Card for mobile layout

// Interface updated to include the new columns
interface TimelineStage {
  id: string;
  stage_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  color_class?: string; // e.g., 'text-blue-600'
  link_text?: string; // e.g., 'See Instructions'
  link_id?: string; // e.g., 'how-it-works-section'
}

// Define formData structure for clarity and completeness
interface StageFormData {
  stage_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  color_class: string;
  link_text: string;
  link_id: string;
}

// Helper to check if a stage is active now
const isStageActive = (stage: TimelineStage) => {
  const now = new Date();
  const start = new Date(stage.start_time);
  const end = new Date(stage.end_time);
  return stage.is_active && now >= start && now <= end;
};

// Helper to format date for display
const formatTimelineDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function AdminTimeline() {
  const [stages, setStages] = useState<TimelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<TimelineStage | null>(null);
  
  // Initialize formData with all fields, including new defaults
  const [formData, setFormData] = useState<StageFormData>({
    stage_name: "",
    start_time: "",
    end_time: "",
    is_active: true,
    color_class: "text-blue-600", // Default
    link_text: "View Next Steps", // Default
    link_id: "how-it-works-section", // Default
  });
  
  const { toast } = useToast();

  const fetchTimeline = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("election_timeline")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error("Error fetching timeline:", error);
      toast({
        title: "Error",
        description: "Failed to load election timeline",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure times are in ISO format for Supabase (even though input handles local time)
    // We send the 'datetime-local' value directly, which is YYYY-MM-DDTHH:MM, Supabase/Postgres typically handles this as a timestamp without timezone or assumes the client's local timezone.
    const submissionData = {
        ...formData,
        // Optional: Convert to UTC string if your database demands it, but 'datetime-local' string is usually fine.
        // start_time: new Date(formData.start_time).toISOString(),
        // end_time: new Date(formData.end_time).toISOString(),
    }; 

    try {
      if (editingStage) {
        const { error } = await supabase
          .from("election_timeline")
          .update(submissionData)
          .eq("id", editingStage.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Timeline stage updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("election_timeline")
          .insert(submissionData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Timeline stage added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingStage(null);
      // Reset form data to defaults
      setFormData({ stage_name: "", start_time: "", end_time: "", is_active: true, color_class: "text-blue-600", link_text: "View Next Steps", link_id: "how-it-works-section" });
      fetchTimeline();
    } catch (error) {
      console.error("Error saving timeline stage:", error);
      toast({
        title: "Error",
        description: `Failed to save timeline stage. ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    // In a real application, replace this with a proper confirmation dialog component.
    if (!confirm("Are you sure you want to delete this timeline stage?")) return;

    try {
        const { error } = await supabase
            .from("election_timeline")
            .delete().eq("id", id);
        if (error) throw error;
        toast({ title: "Success", description: "Timeline stage deleted successfully", });
        fetchTimeline();
    } catch (error) {
        console.error("Error deleting timeline stage:", error);
        toast({ title: "Error", description: "Failed to delete timeline stage", variant: "destructive", });
    }
  };

  const openEditDialog = (stage: TimelineStage) => {
    setEditingStage(stage);
    
    // Load existing fields, including new ones, using defaults for null/undefined values
    // Ensure date strings are formatted correctly for the datetime-local input type (YYYY-MM-DDTHH:MM)
    const formatForInput = (isoString: string) => {
        // Parse the ISO string to a Date object, then to a local date string for the input
        // Since Supabase returns ISO strings (often UTC), we want to convert it to local time for the input
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "";

        // Get local components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    setFormData({
      stage_name: stage.stage_name,
      start_time: formatForInput(stage.start_time),
      end_time: formatForInput(stage.end_time),
      is_active: stage.is_active,
      color_class: stage.color_class || "text-blue-600",
      link_text: stage.link_text || "View Next Steps",
      link_id: stage.link_id || "how-it-works-section",
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingStage(null);
    // Reset form data to defaults for new stage
    setFormData({ stage_name: "", start_time: "", end_time: "", is_active: true, color_class: "text-blue-600", link_text: "View Next Steps", link_id: "how-it-works-section" });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 bg-gray-50 max-w-7xl mx-auto">
      <div className="flex justify-between items-center space-y-2 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Election Timeline Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700 transition duration-150">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Add New Stage</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold">{editingStage ? "Edit" : "Add"} Timeline Stage</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="stage_name">Stage Name</Label>
                <Input
                  id="stage_name"
                  value={formData.stage_name}
                  onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                  placeholder="e.g., Registration Period"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time (Local)</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time (Local)</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
    
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Input for Color Class */}
                <div>
                  <Label htmlFor="color_class">Color Class</Label>
                  <Input
                    id="color_class"
                    value={formData.color_class}
                    onChange={(e) => setFormData({ ...formData, color_class: e.target.value })}
                    placeholder="e.g., text-green-500"
                  />
                </div>
                {/* Input for Link Text */}
                <div>
                  <Label htmlFor="link_text">Button Text</Label>
                  <Input
                    id="link_text"
                    value={formData.link_text}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                    placeholder="e.g., View Results"
                  />
                </div>
                {/* Input for Link ID */}
                <div>
                  <Label htmlFor="link_id">Link Anchor ID</Label>
                  <Input
                    id="link_id"
                    value={formData.link_id}
                    onChange={(e) => setFormData({ ...formData, link_id: e.target.value })}
                    placeholder="e.g., #instructions-section"
                  />
                </div>
              </div>
    
              <div className="flex items-center space-x-2 border-t pt-4">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Publicly Enabled</Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingStage ? "Update" : "Add"} Stage
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- Mobile Responsiveness: Card View for Small Screens --- */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {stages.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent className="text-muted-foreground">
                No timeline stages configured.
            </CardContent>
          </Card>
        ) : (
          stages.map((stage) => (
            <Card key={stage.id} className="shadow-lg border-l-4 border-blue-500">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {stage.stage_name}
                  </div>
                  {isStageActive(stage) ? (
                    <Badge className="bg-green-500 hover:bg-green-600">Active Now</Badge>
                  ) : stage.is_active ? (
                    <Badge variant="outline">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 border-t pt-3">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">Start:</span>
                    </div>
                    <div>{formatTimelineDate(stage.start_time)}</div>

                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">End:</span>
                    </div>
                    <div>{formatTimelineDate(stage.end_time)}</div>
                </div>

                <div className="space-y-1 pt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-700 font-semibold">
                        <LinkIcon className="w-4 h-4" /> Link Action:
                    </div>
                    <div className="pl-5 text-sm">
                        <span className="font-medium text-primary">{stage.link_text || '-'}</span>
                        <span className="text-xs text-muted-foreground block font-mono">({stage.link_id || 'no-id'})</span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(stage)}
                    title="Edit Stage"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(stage.id)}
                    title="Delete Stage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* --- Desktop Responsiveness: Table View for Large Screens --- */}
      <div className="border rounded-lg shadow-xl overflow-x-auto hidden lg:block bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="w-[180px]">Stage Name</TableHead>
              <TableHead className="w-[200px]">Start Time</TableHead>
              <TableHead className="w-[200px]">End Time</TableHead>
             
              <TableHead>Color Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No timeline stages configured. Click "Add New Stage" to get started.
                </TableCell>
              </TableRow>
            ) : (
              stages.map((stage) => (
                <TableRow key={stage.id} className="hover:bg-blue-50/50 transition-colors">
                  <TableCell className="font-semibold text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {stage.stage_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatTimelineDate(stage.start_time)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatTimelineDate(stage.end_time)}
                  </TableCell>
                  
                  {/* Display Link Text and ID */}
                  
                  {/* Display Color Class */}
                  <TableCell>
                    <Badge variant="outline" className={stage.color_class || 'text-gray-500'}>
                        <Palette className="w-3 h-3 mr-1" />
                        {stage.color_class || 'Default'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {isStageActive(stage) ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Active Now</Badge>
                    ) : stage.is_active ? (
                      <Badge variant="outline">Enabled</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(stage)}
                        title="Edit Stage"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(stage.id)}
                        title="Delete Stage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}