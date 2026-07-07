import { useEffect, useState, useMemo, useCallback } from "react";

import Navbar from "@/components/Navbar";
// NOTE: Ensure your actual Supabase client setup is imported correctly.
import { supabase } from "@/integrations/supabase/client"; 
import { Loader2, User, Zap, CheckCircle, Users, Award, Filter, Search, ChevronDown, ChevronUp, Briefcase, MinusCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
// import Navbar from "@/components/Navbar"; // Navbar is not used inside the main view component itself, but its height is accounted for
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react"; 

// --- 1. Type Definitions ---

// The structure for Aspirants table row
interface AspirantRow {
  id: string;
  full_name: string;
  level: string;
  gender: string;
  why_running: string;
  screening_result: string | null;
  promoted_to_candidate: boolean;
  photo_url: string | null;
  aspirant_positions: { name: string } | null; 
}

// The structure for Candidate table row (manual admin entries)
interface CandidateRow {
  id: string;
  full_name: string;
  position: string; // Position NAME (e.g., "President")
  picture_url: string | null;
  manifesto: string | null; // Manifesto is equivalent to why_running
}

// The UNIFIED structure used by the Component (CandidateCard)
interface DisplayCandidate {
    id: string;
    full_name: string;
    positionName: string; // The position name
    manifesto: string;    // The 'Why I'm Running' or 'Manifesto' text
    photoUrl: string | null;
    source: 'aspirant' | 'admin'; 
    level?: string; // Optional (only available for Aspirants)
    gender?: string;
    isQualified: boolean;
}

interface Position {
  name: string;
}


// --- 2. Helper Component: Candidate Card (Interactive & Captivating) ---
interface CandidateCardProps {
  candidate: DisplayCandidate;
}

const CandidateCard: React.FC<CandidateCardProps> = React.memo(({ candidate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const photoFallback = "https://placehold.co/80x80/2563EB/FFFFFF?text=USER";

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-b-4 border-primary/70 transform hover:-translate-y-1 flex flex-col h-full bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-start space-x-4 p-5 pb-2">
        {/* Photo/Placeholder */}
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full overflow-hidden border-4 border-primary/10 shadow-md">
          <img 
            src={candidate.photoUrl || photoFallback} 
            alt={`Photo of ${candidate.full_name}`}
            className="object-cover w-full h-full"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null; 
              (e.target as HTMLImageElement).src = photoFallback;
            }}
          />
        </div>

        {/* Candidate Info */}
        <div className="flex-grow min-w-0">
          <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate hover:text-primary transition-colors">
            {candidate.full_name}
          </CardTitle>
          <CardDescription className="flex items-center space-x-2 text-secondary-500 font-semibold text-base sm:text-lg mt-0.5">
            <Award className="w-4 h-4 text-primary" />
            <span className="truncate">{candidate.positionName || 'Position N/A'}</span>
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow p-5 pt-2 space-y-3">
        
        {/* Detail Badges: Level, Gender, and Screening Status */}
        <div className="flex flex-wrap gap-2">
          {/* Removed Source Badge as requested */}

          {candidate.level && (
            <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
              <GraduationCap className="w-3 h-3 mr-1" /> {candidate.level}
            </Badge>
          )}
          {candidate.gender && (
             <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
              <User className="w-3 h-3 mr-1" /> {candidate.gender}
            </Badge>
          )}
          {candidate.isQualified ? (
            <Badge className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium">
              <CheckCircle className="w-3 h-3 mr-1" /> Qualified
            </Badge>
          ) : (
             <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300">
              <MinusCircle className="w-3 h-3 mr-1" /> Status Pending
            </Badge>
          )}
        </div>

        {/* Manifesto Section (Interactive) */}
        <div className="space-y-2 pt-1">
          <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Candidate's Manifesto:
          </h4>
          <div className="relative">
            <div 
              className={`text-sm text-muted-foreground transition-all ease-in-out duration-500 overflow-hidden ${
                isExpanded ? 'max-h-[500px]' : 'max-h-16 line-clamp-3'
              }`}
            >
              {candidate.manifesto || 'No manifesto provided.'}
            </div>
            {/* Gradient overlay for "Read More" visual cue */}
            {!isExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-card to-transparent pointer-events-none"></div>
            )}
          </div>
        </div>

        {/* Expand Button */}
        <div className="pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-primary font-medium hover:bg-primary/10 transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Read Full Manifesto'}
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

CandidateCard.displayName = 'CandidateCard';


// --- 3. Main Component: PublicCandidatesView ---
export function PublicCandidatesView() {
  const [candidates, setCandidates] = useState<DisplayCandidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all"); // New state for level filter
  
  const LEVELS = useMemo(() => ['100L', '200L', '300L', '400L', '500L'], []);

  // Unified Fetching Logic
  useEffect(() => {
    const fetchAllCandidates = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Promoted Aspirants (Source: aspirant)
        const { data: aspirantsData, error: aspirantsError } = await supabase
          .from("aspirants")
          .select(`
            id, full_name, level, gender, why_running, screening_result, promoted_to_candidate, photo_url,
            aspirant_positions:position_id (name)
          `)
          .eq("promoted_to_candidate", true);

        if (aspirantsError) throw aspirantsError;
        
        // 2. Fetch Manually Created Candidates (Source: admin)
        const { data: candidatesData, error: candidatesError } = await supabase
            .from("candidates")
            .select(`id, full_name, position, picture_url, manifesto`);

        if (candidatesError) throw candidatesError;


        // 4. Map Admin Candidates to unified DisplayCandidate interface
        const adminCandidates: DisplayCandidate[] = (candidatesData as CandidateRow[])
            .map(c => ({
                id: `admin-${c.id}`, // Prefix ID to prevent conflicts with aspirant IDs
                full_name: c.full_name,
                positionName: c.position,
                manifesto: c.manifesto || 'No manifesto submitted.',
                photoUrl: c.picture_url,
                source: 'admin',
                isQualified: true, // Assume manually created candidates are qualified
            }));


        setCandidates(adminCandidates);

        // 6. Fetch all distinct positions for filtering
        const { data: positionsData, error: positionsError } = await supabase
          .from("aspirant_positions")
          .select("name");
        
        if (positionsError) throw positionsError;

        setPositions(positionsData as Position[]);

      } catch (error) {
        console.error("Error fetching candidates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCandidates();
  }, []);

  // --- Filtering Logic (Efficient) ---
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // 1. Position Filter
    if (selectedPosition !== "all") {
      filtered = filtered.filter(c => c.positionName === selectedPosition);
    }
    
    // 2. Level Filter
    if (selectedLevel !== "all") {
        // Only filter candidates who have a defined level (i.e., aspirants)
        filtered = filtered.filter(c => c.level === selectedLevel);
    }


    // 3. Search Filter (Name and Position)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.full_name.toLowerCase().includes(lowerSearch) ||
        c.positionName.toLowerCase().includes(lowerSearch)
      );
    }

    // 4. Sort by position name
    return filtered.sort((a, b) => a.positionName.localeCompare(b.positionName));

  }, [candidates, selectedPosition, selectedLevel, searchTerm]);

  // --- Render States ---

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <p className="mt-4 text-xl font-medium text-gray-700 dark:text-gray-300">Gathering all official candidates...</p>
      </div>
    );
  }

  return (
    // Increased pt-24 (padding-top) to push content below the fixed Navbar
    <div className="container mx-auto pt-24 pb-10 px-4 sm:px-6 lg:px-8">
      
        <Navbar />
      {/* Captivating Header Section */}
      <header className="text-center mb-6 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-4">
          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          The Official Candidates
        </h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Explore the profiles of all candidates running for office.
        </p>
      </header>

      {/* Filter and Search Bar (No longer sticky, fixed layout for 4 items) */}
      <div 
        className="bg-white dark:bg-background pt-4 pb-6 border-b border-border shadow-lg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 transition-all duration-300"
      >
        {/* Responsive Grid: Search takes 2 columns, filters take 1 each on large screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Search Input */}
          <div className="col-span-full lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search candidate name or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-gray-300 focus:ring-primary focus:border-primary transition duration-150 text-base"
            />
          </div>
          
          {/* 2. Position Filter Select */}
          <Select value={selectedPosition} onValueChange={setSelectedPosition}>
            <SelectTrigger className="h-11 border-gray-300 focus:ring-primary focus:border-primary transition duration-150 flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <SelectValue placeholder="Filter by Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions ({candidates.length})</SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos.name} value={pos.name}>
                  {pos.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 3. Level Filter Select */}
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="h-11 border-gray-300 focus:ring-primary focus:border-primary transition duration-150 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gray-500" />
              <SelectValue placeholder="Filter by Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Candidate Grid */}
      <div className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate) => (
              <CandidateCard 
                key={candidate.id} 
                candidate={candidate} 
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 mt-8">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-700 dark:text-gray-300">No Candidates Found</p>
              <p className="text-base text-muted-foreground mt-2">
                Try adjusting your filters or search term.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Display total count at the bottom */}
      <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400 border-t pt-4">
        Displaying **{filteredCandidates.length}** {filteredCandidates.length === 1 ? 'candidate' : 'candidates'} out of **{candidates.length}** total official candidates.
      </div>
    </div>
  );
}

export default PublicCandidatesView;