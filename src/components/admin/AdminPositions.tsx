import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Loader2,
  Edit,
  Award,
  Trophy,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface Position {
  id: string;
  name: string;
  vote_type: "single" | "multiple";
  max_selections: number;
  display_order: number;
}

interface AspirantPosition {
  id: string;
  name: string;
  application_fee: number;
  min_cgpa: number;
  eligible_levels: string[]; // NEW: Array of eligible levels
  description: string;
  is_open: boolean; // RENAMED: from is_active
  created_at: string;
  updated_at: string; // Add updated_at if present in your table
}

export function AdminPositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [aspirantPositions, setAspirantPositions] = useState<
    AspirantPosition[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAspirantDialogOpen, setIsAspirantDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingAspirantPosition, setEditingAspirantPosition] =
    useState<AspirantPosition | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    vote_type: "single" as "single" | "multiple",
    max_selections: 1,
    display_order: 0,
  });
  const [aspirantFormData, setAspirantFormData] = useState({
    name: "",
    application_fee: 0,
    min_cgpa: 3.0,
    // REMOVED: min_level, max_level
    eligible_levels_input: "300, 400, 500", // Input string for simplicity in admin form
    description: "",
    is_open: true, // RENAMED: from is_active
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [positionsResult, aspirantPositionsResult] = await Promise.all([
        supabase.from("positions").select("*").order("display_order"),
        supabase
          .from("aspirant_positions")
          .select("*")
          .order("application_fee", { ascending: false }),
      ]);

      if (positionsResult.error) throw positionsResult.error;
      if (aspirantPositionsResult.error) throw aspirantPositionsResult.error;

      setPositions(positionsResult.data || []);
      setAspirantPositions(aspirantPositionsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load positions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const initializeDefaultPositions = async () => {
    const defaultPositions = [
      {
        name: "President",
        application_fee: 15000,
        min_cgpa: 4.0,
        eligible_levels: ["500"],
        description:
          "Lead the student union and represent students at the highest level. Oversee all union activities and serve as the primary liaison between students and university administration.",
        is_open: true,
      },
      {
        name: "Vice President",
        application_fee: 10000,
        min_cgpa: 3.5,
        eligible_levels: ["400", "500"],
        description:
          "Support the President and oversee union activities. Act as President in their absence and coordinate major union initiatives.",
        is_open: true,
      },
      {
        name: "General Secretary",
        application_fee: 8000,
        min_cgpa: 3.5,
        eligible_levels: ["300", "500"],
        description:
          "Manage union documentation and communications. Maintain official records and coordinate meetings and correspondence.",
        is_open: true,
      },
      {
        name: "Assistant General Secretary",
        application_fee: 6000,
        min_cgpa: 3.5,
        eligible_levels: ["200", "300"],
        description:
          "Assist the General Secretary in administrative duties. Support documentation and communication activities.",
        is_open: true,
      },
      {
        name: "Treasurer",
        application_fee: 8000,
        min_cgpa: 3.5,
        eligible_levels: ["400", "500"],
        description:
          "Manage union finances and budgets. Oversee financial planning, expenditure tracking, and financial reporting.",
        is_open: true,
      },
      {
        name: "Director of Academic Affairs",
        application_fee: 6000,
        min_cgpa: 4.0,
        eligible_levels: ["400", "500"],
        description:
          "Oversee academic matters and student welfare. Coordinate academic programs and represent student academic interests.",
        is_open: true,
      },
      {
        name: "Director of Social Affairs",
        application_fee: 6000,
        min_cgpa: 3.5,
        eligible_levels: ["400", "500"],
        description:
          "Organize social events and student activities. Plan and execute recreational and cultural programs for students.",
        is_open: true,
      },
      {
        name: "Director of Sports",
        application_fee: 6000,
        min_cgpa: 3.5,
        eligible_levels: ["400", "500"],
        description:
          "Coordinate sports activities and competitions. Manage athletic programs and represent students in sports matters.",
        is_open: true,
      },
      {
        name: "Director of Welfare",
        application_fee: 6000,
        min_cgpa: 3.5,
        eligible_levels: ["200", "300"],
        description:
          "Handle student welfare and support services. Address student concerns and coordinate welfare programs.",
        is_open: true,
      },
      {
        name: "Assistant Director of Academic Affairs",
        application_fee: 5000,
        min_cgpa: 3.0,
        eligible_levels: ["200", "300"],
        description:
          "Support academic affairs initiatives. Assist in coordinating academic programs and student academic support.",
        is_open: true,
      },
      {
        name: "Assistant Director of Social Affairs",
        application_fee: 5000,
        min_cgpa: 3.0,
        eligible_levels: ["200", "300"],
        description:
          "Assist in organizing social events. Support the planning and execution of student social activities.",
        is_open: true,
      },
      {
        name: "Assistant Director of Sports",
        application_fee: 5000,
        min_cgpa: 3.0,
        eligible_levels: ["200", "300"],
        description:
          "Support sports activities coordination. Assist in managing athletic programs and sports events.",
        is_open: true,
      },
      {
        name: "Assistant Director of Welfare",
        application_fee: 5000,
        min_cgpa: 3.0,
        eligible_levels: ["200", "300"],
        description:
          "Assist in welfare services. Support student welfare programs and address student concerns.",
        is_open: true,
      },
      {
        name: "PRO I",
        application_fee: 6000,
        min_cgpa: 3.5,
        eligible_levels: ["200", "300"],
        description:
          "Manage external communications and represent the union in public forums.",
        is_open: true,
      },
      {
        name: "PRO II",
        application_fee: 5000,
        min_cgpa: 3.0,
        eligible_levels: ["200", "300"],
        description:
          "Support public relations activities and assist in communication efforts.",
        is_open: true,
      },
    ];

    try {
      const { error } = await supabase
        .from("aspirant_positions")
        .insert(defaultPositions);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default positions initialized successfully",
      });
      fetchData();
    } catch (error) {
      console.error("Error initializing positions:", error);
      toast({
        title: "Error",
        description: "Failed to initialize default positions",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPosition) {
        const { error } = await supabase
          .from("positions")
          .update(formData)
          .eq("id", editingPosition.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Voting position updated successfully",
        });
      } else {
        const { error } = await supabase.from("positions").insert(formData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Voting position added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingPosition(null);
      setFormData({
        name: "",
        vote_type: "single",
        max_selections: 1,
        display_order: 0,
      });
      fetchData();
    } catch (error) {
      console.error("Error saving position:", error);
      toast({
        title: "Error",
        description: "Failed to save voting position",
        variant: "destructive",
      });
    }
  };

  const handleAspirantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const levelsArray = aspirantFormData.eligible_levels_input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    const dataToSubmit = {
      name: aspirantFormData.name,
      application_fee: aspirantFormData.application_fee,
      min_cgpa: aspirantFormData.min_cgpa,
      eligible_levels: levelsArray, // Use the parsed array
      description: aspirantFormData.description,
      is_open: aspirantFormData.is_open, // Use new name
    };

    try {
      if (editingAspirantPosition) {
        const { error } = await supabase
          .from("aspirant_positions")
          .update(dataToSubmit)
          .eq("id", editingAspirantPosition.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Aspirant position updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("aspirant_positions")
          .insert(dataToSubmit);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Aspirant position added successfully",
        });
      }

      setIsAspirantDialogOpen(false);
      setEditingAspirantPosition(null);
      setAspirantFormData({
        name: "",
        application_fee: 0,
        min_cgpa: 3.0,
        eligible_levels_input: "200, 300, 400, 500",
        description: "",
        is_open: true,
      });
      fetchData();
    } catch (error) {
      console.error("Error saving aspirant position:", error);
      toast({
        title: "Error",
        description: "Failed to save aspirant position",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this voting position? This will also delete all candidates for this position."
      )
    )
      return;

    try {
      const { error } = await supabase.from("positions").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Voting position deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting position:", error);
      toast({
        title: "Error",
        description: "Failed to delete voting position",
        variant: "destructive",
      });
    }
  };

  const handleAspirantDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this aspirant position? This will affect existing applications."
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("aspirant_positions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Aspirant position deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting aspirant position:", error);
      toast({
        title: "Error",
        description: "Failed to delete aspirant position",
        variant: "destructive",
      });
    }
  };

  const toggleAspirantPositionStatus = async (
    id: string,
    currentStatus: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("aspirant_positions")
        .update({ is_open: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Position ${
          !currentStatus ? "activated" : "deactivated"
        } successfully`,
      });
      fetchData();
    } catch (error) {
      console.error("Error updating position status:", error);
      toast({
        title: "Error",
        description: "Failed to update position status",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      vote_type: position.vote_type,
      max_selections: position.max_selections,
      display_order: position.display_order,
    });
    setIsDialogOpen(true);
  };

  const openAspirantEditDialog = (position: AspirantPosition) => {
    setEditingAspirantPosition(position);
    setAspirantFormData({
      name: position.name,
      application_fee: position.application_fee,
      min_cgpa: position.min_cgpa,
      // Map array back to string for the input field
      eligible_levels_input: position.eligible_levels.join(", "),
      description: position.description,
      is_open: position.is_open, // Use new name
    });
    setIsAspirantDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingPosition(null);
    const nextOrder =
      positions.length > 0
        ? Math.max(...positions.map((p) => p.display_order)) + 1
        : 0;
    setFormData({
      name: "",
      vote_type: "single",
      max_selections: 1,
      display_order: nextOrder,
    });
    setIsDialogOpen(true);
  };
  const openAspirantAddDialog = () => {
    setEditingAspirantPosition(null);
    setAspirantFormData({
      name: "",
      application_fee: 0,
      min_cgpa: 3.0,
      eligible_levels_input: "200, 300, 400, 500",
      description: "",
      is_open: true,
    });
    setIsAspirantDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-left md:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center md:justify-start">
                  <Award className="w-8 h-8 mr-3 text-blue-600" />
                  Position Management
              </h1>
              <p className="text-lg text-gray-600">
               Manage voting positions and aspirant application positions.
              </p>
            </div>
      <Tabs defaultValue="aspirant"  className="sm:max-w-[180px] lg:max-w-full max-h-[90vh] overflow-y-auto">
        <TabsList className="flex w-full overflow-x-auto justify-start h-10 md:h-12 md:grid md:grid-cols-2 p-1 sm:p-0 bg-muted/50 sm:bg-transparent">
          <TabsTrigger value="aspirant">Aspirant Positions</TabsTrigger>
          <TabsTrigger value="voting">Voting Positions</TabsTrigger>
        </TabsList>

        {/* Aspirant Positions Tab - Made Primary */}
        <TabsContent value="aspirant" className="space-y-4">
          <div className="space-y-2">
            
              <h3 className="text-lg font-semibold">
                Aspirant Application Positions
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure positions available for student applications with
                requirements and fees
              </p>
           
            <div className="gap-2">
              {aspirantPositions.length === 0 && (
                <Button onClick={initializeDefaultPositions} variant="outline">
                  <Trophy className="w-4 h-4 mr-2" />
                  Initialize Defaults
                </Button>
              )}
              <Dialog
                open={isAspirantDialogOpen}
                onOpenChange={setIsAspirantDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={openAspirantAddDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Aspirant Position
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAspirantPosition ? "Edit" : "Add"} Aspirant
                      Position
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAspirantSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="aspirant_name">Position Name</Label>
                        <Input
                          id="aspirant_name"
                          value={aspirantFormData.name}
                          onChange={(e) =>
                            setAspirantFormData({
                              ...aspirantFormData,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g., President, Secretary"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="application_fee">
                          Application Fee (₦)
                        </Label>
                        <Input
                          id="application_fee"
                          type="number"
                          min="0"
                          value={aspirantFormData.application_fee}
                          onChange={(e) =>
                            setAspirantFormData({
                              ...aspirantFormData,
                              application_fee: parseInt(e.target.value),
                            })
                          }
                          placeholder="5000"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="min_cgpa">Minimum CGPA</Label>
                        <Input
                          id="min_cgpa"
                          type="number"
                          step="0.1"
                          min="2.0"
                          max="5.0"
                          value={aspirantFormData.min_cgpa}
                          onChange={(e) =>
                            setAspirantFormData({
                              ...aspirantFormData,
                              min_cgpa: parseFloat(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <Label htmlFor="eligible_levels_input">
                          Eligible Levels (e.g. 200, 300, 400)
                        </Label>
                        <Input
                          id="eligible_levels_input"
                          value={aspirantFormData.eligible_levels_input}
                          onChange={(e) =>
                            setAspirantFormData({
                              ...aspirantFormData,
                              eligible_levels_input: e.target.value,
                            })
                          }
                          placeholder="e.g., 200, 300, 400, 500"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Comma-separated levels. (e.g., 300, 400)
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={aspirantFormData.description}
                        onChange={(e) =>
                          setAspirantFormData({
                            ...aspirantFormData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Brief description of the position responsibilities..."
                        rows={3}
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={aspirantFormData.is_open}
                        onCheckedChange={(checked) =>
                          setAspirantFormData({
                            ...aspirantFormData,
                            is_open: checked,
                          })
                        }
                      />
                      <Label htmlFor="is_active">
                        Position is active for applications
                      </Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAspirantDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingAspirantPosition ? "Update" : "Add"} Position
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position Name</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Min CGPA</TableHead>
                  <TableHead>Level Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aspirantPositions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No aspirant positions configured. Initialize defaults or
                      add your first position.
                    </TableCell>
                  </TableRow>
                ) : (
                  aspirantPositions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{position.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {position.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            ₦{position.application_fee.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{position.min_cgpa.toFixed(1)}</TableCell>
                      <TableCell>
                        {position.eligible_levels.map(l => `${l}`).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={position.is_open ? "default" : "secondary"}>
                          {position.is_open ? "Open" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleAspirantPositionStatus(
                                position.id,
                                position.is_open
                              )
                            }
                          >
                            {position.is_open ? "Open" : "Closed"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAspirantEditDialog(position)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAspirantDelete(position.id)}
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
        </TabsContent>

        {/* Voting Positions Tab */}
        <TabsContent value="voting" className="space-y-4">
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-semibold">Voting Positions</h3>
              <p className="text-sm text-muted-foreground">
                Configure positions that appear on the voting ballot
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} variant="secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Voting Position
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPosition ? "Edit" : "Add"} Voting Position
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Position Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., President, Secretary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="vote_type">Vote Type</Label>
                    <Select
                      value={formData.vote_type}
                      onValueChange={(value: "single" | "multiple") =>
                        setFormData({
                          ...formData,
                          vote_type: value,
                          max_selections:
                            value === "single" ? 1 : formData.max_selections,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Choice</SelectItem>
                        <SelectItem value="multiple">
                          Multiple Choice
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.vote_type === "multiple" && (
                    <div>
                      <Label htmlFor="max_selections">Maximum Selections</Label>
                      <Input
                        id="max_selections"
                        type="number"
                        min="2"
                        value={formData.max_selections}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_selections: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="0"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lower numbers appear first on the ballot
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingPosition ? "Update" : "Add"} Position
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Position Name</TableHead>
                  <TableHead>Vote Type</TableHead>
                  <TableHead>Max Selections</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No voting positions configured. Add your first position to
                      get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">
                        {position.display_order}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-muted-foreground" />
                          {position.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {position.vote_type === "single" ? (
                          <Badge variant="default">Single Choice</Badge>
                        ) : (
                          <Badge variant="secondary">Multiple Choice</Badge>
                        )}
                      </TableCell>
                      <TableCell>{position.max_selections}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(position)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(position.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
