// Utility functions for level calculation and voter analytics
import { supabase } from "@/integrations/supabase/client";

export const CURRENT_ACADEMIC_YEAR = 25; // Represents 2025/2026 academic session

// Fallback function to calculate level from matric number
export const calculateLevelFromMatric = (matric: string): string => {
  const match = matric.match(/^(\d{2})\//);
  if (!match) return "Unknown";

  const entryYear = parseInt(match[1], 10);
  
  if (entryYear > CURRENT_ACADEMIC_YEAR) return "Unknown (Future)";

  const yearDiff = CURRENT_ACADEMIC_YEAR - entryYear;

  switch (yearDiff) {
    case 0: return "100L";
    case 1: return "200L";
    case 2: return "300L";
    case 3: return "400L";
    case 4: return "500L";
    default: return "Final Year/Other";
  }
};

// Main function to get student level - first check database, then fallback to matric calculation
export const getStudentLevel = async (matric: string): Promise<string> => {
  try {
    // First, try to get level from student_roster table
    const { data, error } = await supabase
      .from("student_roster")
      .select("level")
      .eq("matric", matric.toLowerCase())
      .single();

    if (!error && data && data.level) {
      return data.level;
    }
  } catch (error) {
    console.warn("Could not fetch level from database for matric:", matric, error);
  }

  // Fallback to calculating from matric number
  return calculateLevelFromMatric(matric);
};

// Synchronous version for immediate use (uses matric calculation only)
export const getStudentLevelSync = (matric: string): string => {
  return calculateLevelFromMatric(matric);
};

export const LEVEL_ORDER = ["100L", "200L", "300L", "400L", "500L", "Final Year/Other", "Unknown", "Unknown (Future)"];

export interface VoterAnalytics {
  level: string;
  totalEligible: number;
  totalRegistered: number;
  totalVerified: number;
  totalVoted: number;
  registrationRate: number;
  verificationRate: number;
  turnoutRate: number;
}

export const calculateVoterAnalytics = (
  studentRoster: Array<{ matric: string; name: string; level: string }>,
  voters: Array<{ matric: string; verified: boolean; voted: boolean }>
): VoterAnalytics[] => {
  const analytics: { [level: string]: VoterAnalytics } = {};

  // Initialize analytics for each level
  LEVEL_ORDER.forEach(level => {
    analytics[level] = {
      level,
      totalEligible: 0,
      totalRegistered: 0,
      totalVerified: 0,
      totalVoted: 0,
      registrationRate: 0,
      verificationRate: 0,
      turnoutRate: 0,
    };
  });

  // Count eligible students by level
  studentRoster.forEach(student => {
    const level = student.level || getStudentLevelSync(student.matric);
    if (analytics[level]) {
      analytics[level].totalEligible++;
    }
  });

  // Count registered, verified, and voted by level
  voters.forEach(voter => {
    const level = getStudentLevelSync(voter.matric);
    if (analytics[level]) {
      analytics[level].totalRegistered++;
      if (voter.verified) {
        analytics[level].totalVerified++;
      }
      if (voter.voted) {
        analytics[level].totalVoted++;
      }
    }
  });

  // Calculate rates
  Object.keys(analytics).forEach(level => {
    const data = analytics[level];
    data.registrationRate = data.totalEligible > 0 ? (data.totalRegistered / data.totalEligible) * 100 : 0;
    data.verificationRate = data.totalRegistered > 0 ? (data.totalVerified / data.totalRegistered) * 100 : 0;
    data.turnoutRate = data.totalVerified > 0 ? (data.totalVoted / data.totalVerified) * 100 : 0;
  });

  return LEVEL_ORDER.map(level => analytics[level]).filter(data => data.totalEligible > 0);
};