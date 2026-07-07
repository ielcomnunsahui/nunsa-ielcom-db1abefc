import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, GraduationCap, Search, RefreshCw, BarChart3, FileText } from "lucide-react"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; 
import { Separator } from "@/components/ui/separator";
import { VoterAnalyticsCard } from "./VoterAnalyticsCard";
import { getStudentLevelSync, calculateVoterAnalytics, LEVEL_ORDER, VoterAnalytics } from "@/utils/levelCalculator";

// Define interfaces for type safety
interface Student {
  matric: string;
  name: string;
  level: string;
}

interface GroupedRoster {
  [level: string]: Student[];
}

interface Voter {
  id: string;
  matric: string;
  name: string;
  email: string;
  verified: boolean;
  voted: boolean;
  created_at: string;
}

// --- CONFIGURATION ---
const CURRENT_ACADEMIC_YEAR = 25; // Represents 2025/2026 academic session

export function AdminStudentRoster() {
  const { toast } = useToast();
  
  // CSV Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Roster Display State
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [roster, setRoster] = useState<GroupedRoster>({});
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set()); 
  const [rosterSearchTerm, setRosterSearchTerm] = useState("");

  // Voter Analytics State
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(true);
  const [voterAnalytics, setVoterAnalytics] = useState<VoterAnalytics[]>([]);
  
  // --- Data Fetching & Processing ---

  const fetchStudentRoster = useCallback(async () => {
    setIsLoadingRoster(true);
    try {
      const { data, error } = await supabase
        .from("student_roster")
        .select("matric, name, level");

      if (error) throw error;

      const students: Student[] = (data || []) as Student[];
      setAllStudents(students);
      
      const groupedData: GroupedRoster = {};

      students.forEach(student => {
        // Use level from database if available, otherwise calculate from matric
        const studentLevel = student.level || getStudentLevelSync(student.matric);
        
        if (!groupedData[studentLevel]) {
          groupedData[studentLevel] = [];
        }
        groupedData[studentLevel].push({ ...student, level: studentLevel });
      });
      
      // Sort students within each level by matric number
      Object.keys(groupedData).forEach(level => {
        groupedData[level].sort((a, b) => a.matric.localeCompare(b.matric));
      });

      setRoster(groupedData);

    } catch (error) {
      console.error("Error fetching roster:", error);
      toast({
        title: "Roster Error",
        description: "Failed to fetch student list.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRoster(false);
    }
  }, [toast]);

  const fetchVoters = useCallback(async () => {
    setIsLoadingVoters(true);
    try {
      const { data, error } = await supabase
        .from("voters")
        .select("id, matric, name, email, verified, voted, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVoters(data || []);
    } catch (error) {
      console.error("Error fetching voters:", error);
      toast({
        title: "Error",
        description: "Failed to load voter data for analytics.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVoters(false);
    }
  }, [toast]);

  // Calculate analytics when data changes
  useEffect(() => {
    if (allStudents.length > 0 && !isLoadingVoters) {
      const analytics = calculateVoterAnalytics(allStudents, voters);
      setVoterAnalytics(analytics);
    }
  }, [allStudents, voters, isLoadingVoters]);

  useEffect(() => {
    fetchStudentRoster();
    fetchVoters();
  }, [fetchStudentRoster, fetchVoters]);

  // --- Filtered Roster (Memoized for performance) ---

  const sortedLevels = useMemo(() => {
    return LEVEL_ORDER.filter(level => roster[level] && roster[level].length > 0);
  }, [roster]);
  
  const totalStudents = allStudents.length;

  const getFilteredStudentsForLevel = useCallback((level: string): Student[] => {
    const term = rosterSearchTerm.toLowerCase();
    if (!roster[level]) return [];
    if (!term) return roster[level];

    return roster[level].filter(student => 
        student.name.toLowerCase().includes(term) ||
        student.matric.toLowerCase().includes(term)
    );
  }, [roster, rosterSearchTerm]);

  // --- Handlers ---

  const toggleLevel = useCallback((level: string) => {
      setOpenLevels(prev => {
          const newSet = new Set(prev);
          if (newSet.has(level)) {
              newSet.delete(level);
          } else {
              newSet.add(level);
          }
          return newSet;
      });
  }, []);

  const downloadTemplate = () => {
    const csv = "matric,name,level\n21/08nus001,Awwal Abubakar,500L\n24/08nus002,Abubakri Farouq,200L";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_roster_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Ready to be filled with student data.",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      const dataLines = lines.slice(1);
      
      const students = dataLines.map(line => {
        const parts = line.split(",").map(s => s.trim());
        const [matric, name, csvLevel] = parts;
        
        const lowerMatric = matric ? matric.toLowerCase() : "";
        
        const calculatedLevel = lowerMatric ? getStudentLevelSync(lowerMatric) : "Unknown";
        // Use CSV level if provided and valid, otherwise use calculated level
        const finalLevel = csvLevel && csvLevel.toLowerCase() !== "level" ? csvLevel : calculatedLevel; 

        return { matric: lowerMatric, name, level: finalLevel }; 
      });

      // Validation
      const errors: string[] = [];
      const validStudents = students.filter((s, idx) => {
        if (!s.matric || !s.name) {
          errors.push(`Line ${idx + 2}: Missing matric or name`);
          return false;
        }
        if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/.test(s.matric)) {
          errors.push(`Line ${idx + 2}: Invalid matric format - ${s.matric}`);
          return false;
        }
        return true;
      });

      if (validStudents.length === 0) {
        toast({
          title: "No Valid Data",
          description: "CSV contains no valid student records",
          variant: "destructive",
        });
        setUploadResult({ success: 0, errors });
        return;
      }

      // Bulk Upsert
      const { error } = await supabase
        .from("student_roster")
        .upsert(validStudents, { onConflict: "matric" });

      if (error) throw error;

      setUploadResult({ success: validStudents.length, errors });
      
      toast({
        title: "Upload Complete 🎉",
        description: `Successfully uploaded ${validStudents.length} records.`,
      });

      fetchStudentRoster();

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (e.target instanceof HTMLInputElement) {
        e.target.value = "";
      }
    }
  };

  const refreshAllData = () => {
    fetchStudentRoster();
    fetchVoters();
  };

  // --- Helper Component ---
  const StudentList = ({ students, level }: { students: Student[], level: string }) => {
    const isFiltered = rosterSearchTerm.length > 0;
    
    if (students.length === 0) {
        return (
            <div className="p-4 bg-white text-center text-muted-foreground text-sm border-t">
                {isFiltered 
                    ? `No students in ${level} match your search term "${rosterSearchTerm}".`
                    : `No students found for ${level}.`
                }
            </div>
        );
    }

    return (
        <div className="p-4 bg-white max-h-[350px] overflow-y-auto">
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-1/2 text-gray-700">Name</TableHead>
                            <TableHead className="text-right text-gray-700">Matric Number</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                            <TableRow key={student.matric} className="hover:bg-blue-50/50 transition-colors">
                                <TableCell className="font-medium text-gray-800">{student.name}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-gray-600">{student.matric.toUpperCase()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile List View */}
            <ul className="md:hidden divide-y divide-gray-200">
                {students.map((student) => (
                    <li key={student.matric} className="py-2 flex flex-col justify-start items-start text-sm">
                        <span className="font-semibold text-gray-800">{student.name}</span>
                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1">
                            {student.matric.toUpperCase()}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10">
      
      {/* HEADER */}
      <div className="text-left md:text-left">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center md:justify-start">
            <GraduationCap className="w-8 h-8 mr-3 text-blue-600" />
            Voter Roster & Analytics Control Panel
        </h1>
        <p className="text-lg text-gray-600">
          Manage eligible student voters and monitor registration & turnout analytics by academic level.
        </p>
      </div>

      <Separator className="bg-gray-200" />

      {/* VOTER ANALYTICS SECTION */}
      <VoterAnalyticsCard 
        analytics={voterAnalytics} 
        isLoading={isLoadingRoster || isLoadingVoters} 
      />

      {/* STATISTICS */}
      <Card className="shadow-lg bg-white border-t-4 border-blue-600">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Roster Overview
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-800">Total Records</p>
                    <p className="text-2xl font-extrabold text-blue-600 mt-1">{totalStudents}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-800">Active Levels</p>
                    <p className="text-2xl font-extrabold text-green-600 mt-1">{sortedLevels.length}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-sm font-medium text-yellow-800">Academic Session</p>
                    <p className="text-xl font-extrabold text-yellow-600 mt-1">2025/2026</p>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* === CSV UPLOAD WORKFLOW CARD (Left) === */}
        <Card className="shadow-2xl border-2 border-dashed border-blue-300">
          <CardHeader>
             <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-600" />
                Voter Roster Upload Workflow
            </CardTitle>
            <CardDescription>
                Follow these two simple steps to update the eligible voter list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Step 1: Download Template Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                <h3 className="text-xl font-semibold flex items-center gap-3 text-blue-800">
                    <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">1</span>
                    Download CSV Template
                </h3>
                <p className="text-sm text-gray-700">
                    Get the file with the required column headers: matric, name, and level.
                </p>
                <Button 
                    onClick={downloadTemplate} 
                    variant="default" 
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                </Button>
            </div>

            {/* Step 2: File Upload Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-white">
              <h3 className="text-xl font-semibold flex items-center gap-3 text-gray-800">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">2</span>
                Upload Student CSV
              </h3>
              <div>
                <Label htmlFor="csv-upload" className="font-semibold text-gray-700">Select CSV File (.csv)</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="cursor-pointer mt-2 h-12"
                />
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-blue-600 p-3 bg-blue-50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-medium">Processing and synchronizing data...</span>
                </div>
              )}

              {/* Upload Result Alert */}
              {uploadResult && (
                <div className="space-y-3 pt-2">
                  {uploadResult.success > 0 && (
                    <Alert className="border-green-500 bg-green-50 text-green-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="font-semibold">Upload Complete! ({uploadResult.success} records)</AlertTitle>
                      <AlertDescription>
                        Records successfully added or updated. The roster and analytics have been refreshed.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {uploadResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-semibold">Validation Errors ({uploadResult.errors.length})</AlertTitle>
                      <AlertDescription>
                        <div className="text-sm space-y-1 max-h-40 overflow-y-auto list-disc list-inside mt-2">
                          {uploadResult.errors.slice(0, 5).map((err, idx) => (
                            <div key={idx} className="truncate">{err}</div>
                          ))}
                          {uploadResult.errors.length > 5 && (
                            <div className="text-xs text-gray-200 mt-1">... and {uploadResult.errors.length - 5} more errors.</div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
              <h4 className="font-semibold text-sm mb-2 text-gray-700">Important Note on Level Calculation:</h4>
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                <li>The system first checks the database for existing level information for each student.</li>
                <li>If no level is found in the database, it automatically calculates based on the entry year in the matric number (e.g., `24/....` is 200L in the 2025/2026 session).</li>
                <li>Providing the `level` in the CSV overrides both database and automatic calculation.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* === STUDENT ROSTER DISPLAY CARD (Right) === */}
        <Card className="shadow-2xl border-2 border-blue-600">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
               <FileText className="w-6 h-6 text-blue-600" />
               Current Roster by Level
           </CardTitle>
           <CardDescription>Browse and search through the synchronized student list.</CardDescription>
          </CardHeader>
          <CardContent>
            
            {/* Roster Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or matric number..."
                    value={rosterSearchTerm}
                    onChange={(e) => setRosterSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-blue-300 focus-visible:ring-blue-500"
                />
            </div>

            {isLoadingRoster ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
                <p>Loading student roster...</p>
              </div>
            ) : totalStudents === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-dashed p-6 rounded-lg bg-gray-50">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
                <p className="font-semibold">No student records found in the roster.</p>
                <p className="text-sm mt-1">Please upload the CSV file on the left.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {sortedLevels.map((level) => {
                  const filteredStudents = getFilteredStudentsForLevel(level);
                  const studentsCount = roster[level]?.length || 0;
                  const filteredCount = filteredStudents.length;
                  const isOpen = openLevels.has(level);

                  // Show level even if no students match search, but hide if no students at all
                  if (studentsCount === 0) return null;

                  return (
                    <div key={level} className="border rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
                        <button
                            onClick={() => toggleLevel(level)}
                            className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors rounded-t-lg ${isOpen ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                            <span className={`text-lg font-bold ${isOpen ? 'text-blue-700' : 'text-gray-800'}`}>{level} Students</span>
                            <div className="flex items-center gap-3">
                                {rosterSearchTerm.length > 0 && (
                                    <span className="text-sm text-gray-600">
                                        {filteredCount} / {studentsCount}
                                    </span>
                                )}
                                <span className="text-base bg-blue-600 text-white px-3 py-1 rounded-full font-bold min-w-[30px] text-center">
                                    {rosterSearchTerm.length > 0 ? filteredCount : studentsCount}
                                </span>
                                {isOpen ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                            </div>
                        </button>
                        <div 
                           className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] border-t' : 'max-h-0'}`}
                           style={{ maxHeight: isOpen ? '500px' : '0' }}
                        >
                            {isOpen && <StudentList students={filteredStudents} level={level} />}
                        </div>
                    </div>
                  );
                })}
              </div>
            )}
            </CardContent>
            <CardFooter className="pt-4 border-t bg-gray-50 rounded-b-lg">
              <Button onClick={refreshAllData} variant="outline" disabled={isLoadingRoster || isLoadingVoters} className="w-full sm:w-auto border-blue-300 hover:bg-blue-50">
                  <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingRoster || isLoadingVoters) ? 'animate-spin' : ''}`} />
                  {(isLoadingRoster || isLoadingVoters) ? 'Refreshing...' : 'Refresh Data & Analytics'}
              </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}