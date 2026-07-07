import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/footerr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Vote,
  FileText,
  Eye,
  Home,
  UserPlus,
  Trophy,
  Scale,
  Users,
  Download,
  Printer,
  Shield,
  UserCheck,
  BookOpen,
  Dumbbell,
  PartyPopper,
  HeartHandshake,
  Megaphone,
  CheckCircle,
  GraduationCap,
} from "lucide-react";

// --- 1. Static Data for Positions ---
const positions = [
  {
    title: "President",
    icon: Users,
    description:
      "Leads the association, represents students, chairs meetings, and oversees all activities.",
  },
  {
    title: "Vice President",
    icon: Users,
    description: "Assists the President, and acts in President's absence.",
  },
  {
    title: "General Secretary",
    icon: BookOpen,
    description:
      "Records meeting minutes, maintains correspondence, and handles documentation.",
  },
  {
    title: "Assistant General Secretary",
    icon: BookOpen,
    description:
      "Assist the general secretary in all his duties. Act for the general secretary in case he is absent.",
  },
  {
    title: "Financial Secretary",
    icon: Scale,
    description:
      "Manages financial records, assists treasurer, and maintains financial documentation.",
  },
  {
    title: "Treasurer",
    icon: Scale,
    description:
      "Manages association funds, budgets, and financial transactions.",
  },
  
  {
    title: "Academic Director I and II",
    icon: GraduationCap, 
    description:
      "Coordinates academic activities and represents students in academic matters.",
  },
  {
    title: "Sports Director I and II",
    icon: Dumbbell, 
    description:
      "Organizes sports activities and represents the association in inter-faculty competitions.",
  },
  {
    title: "Social Director I and II",
    icon: PartyPopper, 
    description:
      "Plans social events, entertainment programs, and cultural activities.",
  },
  {
    title: "Welfare Director I and II",
    icon: HeartHandshake, 
    description:
      "Addresses student welfare issues and coordinates support programs.",
  },
  {
    title: "Public Relations Officer I and II",
    icon: Megaphone, 
    description:
      "Manages public relations, communications, and media relations.",
  },
  {
    title: "Auditor General",
    icon: CheckCircle, 
    description:
      "Reviews financial records and ensures transparency in financial management.",
  },
];


// --- 2. Main Component ---
function RulesPage() {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // --- Dynamic Content Structure (Converted strings to JSX lists for semantic HTML) ---
  const constitutionSections = [
    {
      id: "Leadership Positions",
      title: "LEADERSHIP POSITIONS AND ROLES",
      icon: UserCheck,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {positions.map((position, index) => (
            <div
              key={index}
              className="border border-border rounded-lg p-4 bg-muted/30 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <position.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {position.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {position.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "article-one-general",
      title: "VOTER ELIGIBILITY",
      icon: Users,
      content: (
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Must be a bonafide student of Al-Hikmah University, Ilorin.</li>
          <li>Must be a registered student in the faculty of Nursing Sciences Students List.</li>
          <li>Must have paid current session Association fees.</li>
          <li>Must complete voter registration with a valid matric number.</li>
          <li>Must verify identity via biometric authentication or Email OTP.</li>
          <li>Each voter can vote only once.</li>
          <li>One vote per position per student.</li>
        </ul>
      ),
    },
    {
      id: "article-two-council",
      title: "CANDIDATE REQUIREMENTS",
      icon: FileText,
      content: (
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Must be a Bonafide student of Al-Hikmah University.</li>
          <li>Minimum CGPA requirement varies by position (to be verified).</li>
          <li>Must not be on academic probation.</li>
          <li>Must submit all required documents.</li>
          <li>Must pay nomination fees as specified.</li>
          <li>Must attend mandatory screening.</li>
        </ul>
      ),
    },
    {
      id: "standing-rules",
      title: "VOTING PROCESS",
      icon: Vote,
      content: (
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Voting is conducted electronically via the official platform.</li>
          <li>Secret ballot system ensures privacy and anonymity.</li>
          <li>The official Voting Period will be announced publicly.</li>
          <li>No proxy voting allowed.</li>
          <li>A vote, once submitted, cannot be changed.</li>
          <li>The system automatically prevents double voting.</li>
        </ul>
      ),
    },
    {
      id: "oath-of-office",
      title: "ELECTORAL MALPRACTICE",
      icon: Shield,
      content: (
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Vote buying or selling is strictly prohibited.</li>
          <li>Intimidation of voters is a serious offense.</li>
          <li>Unauthorized access to voting systems or data is illegal.</li>
          <li>Impersonation of another voter is grounds for immediate disqualification.</li>
          <li>Disruption of the electoral process in any manner.</li>
          <li>Violations may result in Disciplinary actions, sanctions, or Disqualification.</li>
        </ul>
      ),
    },
    {
      id: "Appeals-Complaints",
      title: "APPEALS & COMPLAINTS",
      icon: AlertTriangle,
      content: (
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Written or email complaints must be submitted within 48 hours to the IELCOM Secretary.</li>
          <li>Appeals must be formally addressed to the Electoral Committee.</li>
          <li>Evidence must accompany all complaints for consideration.</li>
          <li>Frivolous or unsubstantiated complaints may attract sanctions.</li>
          <li>The Electoral Commission's decision on appeals is final.</li>
          <li>Further legal action must be pursued through the NUNSA Constitution's stated channels only.</li>
        </ul>
      ),
    },
  ];
  // END OF CONTENT

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.open('/NUNSA HUI CONSTITUTION (AS AMENDED, SEPTEMBER 2025).docx', '_blank');
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Navbar component (assumed fixed/sticky) */}
        <Navbar />

        {/* Main Content: pt-24 ensures the content starts below the fixed Navbar */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          
          {/* Hero Section */}
          <div className="text-center mb-16 print:mb-8">
            <div className="flex justify-center mb-6 print:hidden">
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg">
                <Scale className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2">
              NUNSA HUI Electoral Rules
            </h1>
            <Badge 
                variant="outline" 
                className="mt-2 text-muted-foreground font-bold leading-relaxed print:text-base print:text-black text-base py-1 px-3 border-border"
            >
              (AS AMENDED, SEPTEMBER 2025)
            </Badge>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed mt-4 print:text-base print:text-black">
              The complete set of rules governing all electoral processes of the Nigerian Universities Nursing Students' Association (NUNSA) - Al-Hikmah University Chapter.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-8 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl font-semibold transition-colors h-12"
              >
                <Printer className="h-5 w-5" />
                <span>Print Rules</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center space-x-2 bg-background border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 py-3 rounded-2xl font-semibold transition-colors h-12"
              >
                <Download className="h-5 w-5" />
                <span>Download Full Document</span>
              </button>
            </div>
          </div>

          
          {/* Constitution Sections: Accordion */}
          <div className="max-w-5xl mx-auto">
            {/* Initial Important Notice */}
            <Card className="mb-8 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-md">
              <CardContent className="flex items-start gap-4 p-6">
                <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-orange-800 dark:text-orange-300 mb-2 text-xl">MANDATORY READING</h3>
                  <p className="text-orange-700 dark:text-orange-400 text-base">
                    All participants (voters and aspirants) are required to read, understand, and abide by these rules. 
                    Ignorance of the constitution will not be accepted as an excuse for violations. 
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              {constitutionSections.map((section) => {
                const IconComponent = section.icon;
                const isOpen = openSections[section.id];

                return (
                  <div
                    key={section.id}
                    className="constitution-section bg-card rounded-xl shadow-lg border border-border overflow-hidden" 
                  >
                    {/* ACCORDION BUTTON: Hidden when printing */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full p-6 text-left hover:bg-muted/50 transition-colors print:hidden focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <h2 className="text-lg md:text-xl font-bold text-foreground">
                            {section.title}
                          </h2>
                        </div>
                        <div className="flex-shrink-0">
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* FIX 1: Accordion Content - Only render when isOpen is TRUE and HIDE when printing */}
                    {isOpen && (
                      <div className="px-6 pb-6 pt-0 transition-all duration-300 ease-in-out print:hidden">
                        <div className="prose max-w-none text-muted-foreground">
                          {section.content}
                        </div>
                      </div>
                    )}
                    
                    {/* FIX 2: Print Content - Explicitly HIDDEN on screen, BLOCK when printing */}
                    <div className="hidden print:block print:px-6 print:pb-6 print:pt-4">
                         {/* Re-add title for clear section breaks in print */}
                         <h3 className="print:text-lg print:font-bold print:text-gray-900 print:mt-4 print:mb-2">
                             {section.title}
                         </h3>
                         <div className="print:prose-sm print:max-w-none print:text-black">
                             {section.content}
                         </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Navigation (Hidden in print) */}
          <div className="max-w-5xl mx-auto mt-16 print:hidden">
            <Card className="rounded-2xl shadow-xl border-border">
              <CardHeader className="p-6 pb-0">
                 <CardTitle className="text-center text-2xl text-foreground">Quick Navigation</CardTitle>
                 <CardDescription className="text-center">Jump to key election pages.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Item 1: Homepage */}
                  <Link
                    to="/"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors group touch-manipulation"
                  >
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:bg-primary/90 transition-colors">
                      <Home className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <p className="font-semibold text-foreground text-center text-sm">Homepage</p>
                  </Link>

                  {/* Item 2: Register */}
                  <Link
                    to="/register"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors group touch-manipulation"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-foreground text-center text-sm">Register to Vote</p>
                  </Link>
                  
                  {/* Item 3: Apply */}
                  <Link
                    to="/aspirant-login"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors group touch-manipulation"
                  >
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-foreground text-center text-sm">Apply for Position</p>
                  </Link>

                  {/* Item 4: Live Results */}
                  <Link
                    to="/results"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors group touch-manipulation"
                  >
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-foreground text-center text-sm">View Live Results</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer (Hidden in print) */}
        <Footer />

        {/* Global Print Styles to ensure all sections are printed */}
        <style>{`
        @media print {
          /* Hide all navigational elements and buttons */
          header, footer, .print\\:hidden, button {
            display: none !important;
          }
          
          /* Ensure body background and text color are print-friendly */
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Print section styling */
          .constitution-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-top: 1.5rem;
            border: 1px solid #ccc;
            padding: 0.5rem;
          }
          
          /* Text styling adjustments for print */
          .prose {
            font-size: 10pt;
            line-height: 1.5;
            color: black !important;
          }

          /* Titles styling for print */
          h1, h2, h3, h4, .text-xl {
              color: black !important;
          }

          /* Main content margin adjustment for printing */
          main {
              padding-top: 1rem !important;
          }
        }
      `}</style>
      </div>
    </>
  );
}

export default RulesPage;