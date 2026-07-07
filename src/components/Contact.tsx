import { AlertCircle, Mail, FileText, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Helper component for individual contact items
const ContactItem = ({ name, number, href, icon: Icon }) => (
  <div className="flex flex-col items-start p-4 bg-white dark:bg-gray-700 rounded-xl shadow-md border border-red-100 dark:border-red-900 transition-shadow hover:shadow-lg">
    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-2 flex-shrink-0">
      <Icon className="w-5 h-5 text-red-600 dark:text-red-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight mb-1">
      {name}
    </h3>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-base font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
      aria-label={`Contact ${name} via WhatsApp`}
    >
      {number}
    </a>
  </div>
);

export const Contact = () => {
  // Assuming 'secondary' is a primary/accent color and 'muted' is a light background color
  // We will primarily use red and gray to maintain the alert theme.

  return (
    <section 
      className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl"
      aria-labelledby="emergency-support-heading"
    >
      
      {/* 1. Header & Call to Action */}
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <AlertCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 id="emergency-support-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Emergency Technical Support
          </h3>
          <p className="text-gray-700 dark:text-gray-300 text-base">
            For urgent technical issues during voting periods or critical system problems, please use the contact methods below.
          </p>
        </div>
      </div>
      
      {/* 2. Contact Grid (Mobile Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact 1: IELCOM Chairman (WhatsApp) */}
        <ContactItem
          name="IELCOM Chairman"
          number="+234 704 064 0646"
          href="https://wa.me/2347040640646"
          icon={MessageCircle}
        />
        
        {/* Contact 2: Electoral Organizer (WhatsApp/Phone) */}
        <ContactItem
          name="Electoral Organizer"
          number="+234 912 350 2971"
          // Note: The original URL +2349123502971 is used for consistency
          href="https://wa.me/2349123502971" 
          icon={Phone}
        />
      </div>
      
      {/* 3. Support Instructions */}
      <div className="mt-8 p-5 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-700">
        <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Support Guidelines
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
            <li>For official inquiries and documentation, Email is the primary contact method (24-48 hours response time).</li>
            <li>For quick, non-critical questions, use WhatsApp to chat with our general support line.</li>
            <li>When contacting support via any medium, please provide your full name, registration number, and a detailed description of the issue.</li>
            <li>Response to critical technical issues is prioritized and generally immediate.</li>
        </ul>
      </div>

      {/* Optional: General Email Button for easy access */}
      <div className="text-center pt-4">
        <a 
          href="mailto:ielcomnunsahui@gmail.com"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-colors"
        >
          <Mail className="w-4 h-4" />
          General Email Support
        </a>
      </div>

    </section>
  );
};