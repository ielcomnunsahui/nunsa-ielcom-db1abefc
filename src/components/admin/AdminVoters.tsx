import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  MoreVertical,
  Users,
  RotateCcw,
  X,
  UserCheck,
  UserX,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { VoterAnalyticsCard } from "./VoterAnalyticsCard";
import { getStudentLevelSync, calculateVoterAnalytics, VoterAnalytics } from "@/utils/levelCalculator";

interface Voter {
  id: string;
  matric: string;
  name: string;
  email: string;
  verified: boolean;
  voted: boolean;
  created_at: string;
}

interface Student {
  matric: string;
  name: string;
  level: string;
}

// Helper to format date in a user-friendly way
const formatRegistrationDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type StatusFilter = "all" | "verified" | "unverified" | "voted" | "not_voted";
type LevelFilter = "all" | "100L" | "200L" | "300L" | "400L" | "500L" | "Final Year/Other" | "Unknown";

export function AdminVoters() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [voterAnalytics, setVoterAnalytics] = useState<VoterAnalytics[]>([]);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const fetchVoters = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("voters")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVoters(data || []);
    } catch (error) {
      console.error("Error fetching voters:", error);
      toast({
        title: "Error",
        description: "Failed to load voters.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from("student_roster")
        .select("matric, name, level");

      if (error) throw error;
      
      // Process students to ensure level is calculated
      const processedStudents = (data || []).map(student => ({
        ...student,
        level: student.level || getStudentLevelSync(student.matric)
      }));
      
      setStudents(processedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load student roster for analytics.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  }, [toast]);

  // Calculate analytics when data changes
  useEffect(() => {
    if (students.length > 0 && !isLoading) {
      const analytics = calculateVoterAnalytics(students, voters);
      setVoterAnalytics(analytics);
    }
  }, [students, voters, isLoading]);

  useEffect(() => {
    fetchVoters();
    fetchStudents();
  }, [fetchVoters, fetchStudents]);

  // --- Enhanced Filtering & Pagination Logic ---

  const filteredVoters = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    let filteredBySearch = voters.filter(
      (voter) =>
        voter.name.toLowerCase().includes(searchLower) ||
        voter.matric.toLowerCase().includes(searchLower) ||
        voter.email.toLowerCase().includes(searchLower)
    );

    // Filter by status
    filteredBySearch = filteredBySearch.filter((voter) => {
      switch (statusFilter) {
        case "verified":
          return voter.verified;
        case "unverified":
          return !voter.verified;
        case "voted":
          return voter.voted;
        case "not_voted":
          return !voter.voted;
        case "all":
        default:
          return true;
      }
    });

    // Filter by level
    if (levelFilter !== "all") {
      filteredBySearch = filteredBySearch.filter((voter) => {
        const voterLevel = getStudentLevelSync(voter.matric);
        return voterLevel === levelFilter;
      });
    }

    setCurrentPage(1); // Reset to first page on filter/search change
    return filteredBySearch;
  }, [searchTerm, voters, statusFilter, levelFilter]);

  const totalPages = Math.ceil(filteredVoters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVoters = filteredVoters.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Get level distribution for filter options
  const availableLevels = useMemo(() => {
    const levels = new Set(voters.map(voter => getStudentLevelSync(voter.matric)));
    return Array.from(levels).sort();
  }, [voters]);

  // --- Admin Actions ---

  const toggleVoterVerification = async (voter: Voter) => {
    const newStatus = !voter.verified;
    // Optimistic update
    setVoters((prevVoters) =>
      prevVoters.map((v) =>
        v.id === voter.id ? { ...v, verified: newStatus } : v
      )
    );

    try {
      const { error } = await supabase
        .from("voters")
        .update({ verified: newStatus })
        .eq("id", voter.id);

      if (error) throw error;

      toast({
        title: "Verification Updated",
        description: `${voter.name} is now ${
          newStatus ? "Verified" : "Unverified"
        }.`,
      });
    } catch (error) {
      console.error("Error updating voter verification:", error);
      // Revert state on failure
      setVoters((prevVoters) =>
        prevVoters.map((v) =>
          v.id === voter.id ? { ...v, verified: voter.verified } : v
        )
      );
      toast({
        title: "Error",
        description: "Failed to update verification status.",
        variant: "destructive",
      });
    }
  };

  const resetVoterVote = async (voter: Voter) => {
    // Optimistic update
    setVoters((prevVoters) =>
      prevVoters.map((v) => (v.id === voter.id ? { ...v, voted: false } : v))
    );

    try {
      const { error } = await supabase
        .from("voters")
        .update({ voted: false })
        .eq("id", voter.id);

      if (error) throw error;

      toast({
        title: "Vote Reset",
        description: `${voter.name}'s vote has been successfully reset.`,
      });
    } catch (error) {
      console.error("Error resetting voter vote:", error);
      // Revert state on failure
      setVoters((prevVoters) =>
        prevVoters.map((v) => (v.id === voter.id ? { ...v, voted: true } : v))
      );
      toast({
        title: "Error",
        description: "Failed to reset voter vote.",
        variant: "destructive",
      });
    }
  };

  const refreshAllData = () => {
    fetchVoters();
    fetchStudents();
  };

  // --- Render Functions ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-left md:text-left">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center md:justify-start">
          <Users className="w-8 h-8 mr-3 text-blue-600" />
          Voter Management & Analytics
        </h1>
        <p className="text-lg text-gray-600">
          Monitor voter registrations, verifications, and turnout rates by academic level.
        </p>
      </div>

      {/* Voter Analytics Section */}
      <VoterAnalyticsCard 
        analytics={voterAnalytics} 
        isLoading={isLoading || isLoadingStudents} 
      />

      {/* Controls and Filters */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Voter Database
          </CardTitle>
          <CardDescription>
            Search, filter, and manage individual voter records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, matric, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-8"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <Select
              value={statusFilter}
              onValueChange={(value: StatusFilter) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Voters</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="voted">Voted</SelectItem>
                <SelectItem value="not_voted">Not Voted</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={levelFilter}
              onValueChange={(value: LevelFilter) => setLevelFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {availableLevels.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={refreshAllData} variant="outline" disabled={isLoading || isLoadingStudents}>
              <RotateCcw className={`w-4 h-4 mr-2 ${(isLoading || isLoadingStudents) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Registered</p>
              <p className="text-2xl sm:text-3xl font-bold">{voters.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                {voters.filter((v) => v.verified).length}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Voted</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                {voters.filter((v) => v.voted).length}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Current Filter</p>
              <p className="text-2xl sm:text-3xl font-bold">
                {filteredVoters.length}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Showing Level</p>
              <p className="text-lg font-bold text-purple-600">
                {levelFilter === "all" ? "All" : levelFilter}
              </p>
            </div>
          </div>

          {/* Voter Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matric Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Voted</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVoters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || levelFilter !== "all" 
                        ? "No voters found matching your filters." 
                        : "No voters registered yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedVoters.map((voter) => (
                    <TableRow key={voter.id}>
                      <TableCell className="font-mono">{voter.matric}</TableCell>
                      <TableCell className="font-medium">{voter.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {getStudentLevelSync(voter.matric)}
                        </Badge>
                      </TableCell>
                      <TableCell>{voter.email}</TableCell>
                      <TableCell>
                        {voter.verified ? (
                          <Badge variant="default" className="bg-success">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {voter.voted ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRegistrationDate(voter.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleVoterVerification(voter)}
                              className="cursor-pointer"
                            >
                              {voter.verified ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Mark Unverified
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Mark Verified
                                </>
                              )}
                            </DropdownMenuItem>
                            {voter.voted && (
                              <DropdownMenuItem
                                onClick={() => resetVoterVote(voter)}
                                className="cursor-pointer"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset Vote
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredVoters.length)} of {filteredVoters.length} voters
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}