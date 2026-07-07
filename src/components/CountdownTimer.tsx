import { useEffect, useState, useCallback } from "react";
import { Clock, CheckCircle, ArrowRight, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: Date;
  stageName: string;
  stageColor: string; // The color class (e.g., bg-blue-600)
  linkToId?: string; // Optional prop for anchor link ID
  linkText?: string; // Optional prop for link text
  // Feature Enhancement: Allows customizing the link button style for completed stages
  linkVariant?: "default" | "success" | "outline"; 
}

// --- Helper Component: Individual Time Block ---
const TimeBlock: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="text-center p-1">
    {/* Ensure fixed width font for smooth counting (tabular-nums) */}
    <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-none tabular-nums transition-transform duration-300">
      {String(value).padStart(2, "0")}
    </div>
    {/* Smaller font for label on mobile */}
    <div className="text-xs sm:text-sm opacity-80 mt-1 uppercase font-medium tracking-wider">
      {label}
    </div>
  </div>
);

const CountdownTimer = ({
  targetDate,
  stageName,
  stageColor,
  linkToId,
  linkText,
  linkVariant = "default", // Default to 'default' if not provided
}: CountdownTimerProps) => {
  
  // Logic to calculate remaining time
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = +targetDate - +new Date();
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  // Timer interval setup
  useEffect(() => {
    // Initial call to set state accurately immediately
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  // Derived state
  const isTimeUp =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  // Ensure the color prop is a background class
  const finalColorClass = stageColor.startsWith("bg-") ? stageColor : "bg-blue-600"; 
  const StatusIcon = isTimeUp ? CheckCircle : Clock;

  // Anchor link scroll handler
  const handleLinkClick = () => {
    if (linkToId) {
      document.getElementById(linkToId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Determine button colors based on variant
  let buttonClasses = "shadow-xl gap-2 w-full sm:w-auto hover:scale-[1.02] transform transition-transform";
  if (linkVariant === "success") {
    buttonClasses += " bg-green-500 hover:bg-green-600 text-white";
  } else if (linkVariant === "outline") {
    buttonClasses += " bg-white text-gray-800 hover:bg-gray-100 border border-gray-300";
  } else { // default variant
    buttonClasses += " bg-white text-blue-600 hover:bg-gray-100";
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in px-2" role="timer">
      {/* Main Countdown Card - Uses dynamic color and shadow */}
      <div
        className={`${
          isTimeUp ? "bg-green-600 shadow-green-500/50" : finalColorClass
        } text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 relative overflow-hidden shadow-2xl transition-all duration-500`}
      >
        {/* Dark overlay for better text contrast (mobile enhancement) */}
        <div className="absolute inset-0 bg-black/10 z-0" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-4 sm:gap-6">
            
            {/* Current Stage Display (Left Side) */}
            <div className="flex items-center space-x-3 sm:space-x-4 text-center sm:text-left w-full sm:w-auto justify-center sm:justify-start">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-light opacity-90">
                    {isTimeUp ? "Current Stage Status" : "Active Timeline Stage"}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold mt-0.5">
                  {stageName}
                </h2>
              </div>
            </div>
            
            {/* Countdown or Action Display (Right Side) */}
            <div className="text-center sm:text-right w-full sm:w-auto" aria-live="polite">
              {isTimeUp ? (
                // *** Content when time is up ***
                <div className="flex flex-col items-center sm:items-end w-full">
                  <p className="text-xl sm:text-2xl font-bold mb-2">Stage Finished!</p>
                  {linkToId && linkText && (
                    <Button
                      onClick={handleLinkClick}
                      className={buttonClasses}
                      variant={linkVariant === "outline" ? "outline" : "default"}
                    >
                      {linkText}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                // *** Mobile-Optimized Countdown Display ***
                <>
                  <div className="flex items-center justify-center sm:justify-end space-x-2 mb-3">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    <span className="font-semibold text-sm sm:text-base">
                      Time Remaining
                    </span>
                  </div>
                  
                  {/* Grid layout for countdown blocks (responsive gaps) */}
                  {timeLeft && (
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 max-w-sm mx-auto sm:mx-0">
                      <TimeBlock value={timeLeft.days} label="Days" />
                      <TimeBlock value={timeLeft.hours} label="Hours" />
                      <TimeBlock value={timeLeft.minutes} label="Minutes" />
                      <TimeBlock value={timeLeft.seconds} label="Seconds" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Status Bar at the bottom (Date Display) */}
          <div className="flex items-center justify-center sm:justify-start space-x-2 border-t border-white/20 pt-3 sm:pt-4 mt-3 sm:mt-4">
            <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            <span className="font-semibold text-xs sm:text-sm text-center sm:text-left">
              {isTimeUp
                ? "Stage duration officially complete"
                : `Ends: ${targetDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`}
            </span>
          </div>
        </div>
        
        {/* Decorative background circles (moved to Z-0 but still outside the content overlay) */}
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 opacity-10 z-0">
          <div className="w-full h-full bg-white rounded-full -translate-y-8 translate-x-8 sm:-translate-y-12 sm:translate-x-12 lg:-translate-y-16 lg:translate-x-16" />
        </div>
        <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 opacity-10 z-0">
          <div className="w-full h-full bg-white rounded-full translate-y-4 -translate-x-4 sm:translate-y-6 sm:-translate-x-6 lg:translate-y-8 lg:-translate-x-8" />
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;