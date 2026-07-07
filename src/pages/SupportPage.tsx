import { 
  Mail, 
  MessageCircle, 
  MapPin, 
  HelpCircle, 
  Book, 
  Users, 
  Link,
  ChevronDown,
  UserCheck, // For Voter Guide
  Trophy, // For Aspirant Guide
  CreditCard,
  FileText
} from 'lucide-react';

import Navbar from "@/components/Navbar"; 
import Footer from "@/components/footerr"; 
import { Contact } from "@/components/Contact"; 
// --- Data Definitions ---

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get a detailed response within 24 hours.',
    contact: 'ielcomnunsahui@gmail.com',
    href: 'mailto:ielcomnunsahui@gmail.com',
    color: 'bg-blue-600',
    hover: 'hover:border-blue-600',
    linkText: 'Send Email'
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Chat',
    description: 'Instant chat for quick questions and issues.',
    contact: '+234 704 064 0646',
    href: 'https://wa.me/2347040640646',
    color: 'bg-green-600',
    hover: 'hover:border-green-600',
    linkText: 'Start Chat'
  },
  {
    icon: MapPin,
    title: 'Physical Office',
    description: 'For printing and in-person inquiries (Office Hours Only).',
    contact: 'Sen Kasim Shettima, NUNSA Complex Building',
    href: '#',
    color: 'bg-purple-600',
    hover: 'hover:border-purple-600',
    linkText: 'View Location'
  }
];

const coreNavigation = [
  {
    icon: FileText,
    title: 'Electoral Rules',
    description: 'Check the official Electoral Guidelines and NUNSA Constitution.',
    href: '/rules',
    color: 'text-indigo-600',
    linkText: 'View Rules'
  },
  {
    icon: Users,
    title: 'Voter Registration',
    description: 'Quick link to register and verify your eligibility.',
    href: '/register',
    color: 'text-teal-600',
    linkText: 'Go to Registration'
  },
  {
    icon: Trophy,
    title: 'Aspirant Application',
    description: 'Quick link to begin your application for leadership.',
    href: '/aspirant',
    color: 'text-pink-600',
    linkText: 'Apply Now'
  }
];

const faqs = [
  {
    question: 'Can I change my vote after submitting?',
    answer: 'No, votes are final once submitted for security and integrity reasons. Please review your choices carefully before confirming.'
  },
  {
    question: 'When will the results be announced?',
    answer: 'Results are available in real-time on the Live Results page during voting for Electoral Committee and Aspirants delegates. Final results will be published by the electoral committee immediately after the voting period ends.'
  },
  {
    question: 'Is my vote secure and private?',
    answer: 'Yes, we use advanced security measures including encryption, audit trails, and biometric authentication to ensure vote security and privacy. Your vote is anonymous and auditable.'
  },
  {
    question: 'What if I forgot my login credentials?',
    answer: 'You can use the "Forgot Password" option on the login page, or contact support via Email or WhatsApp for immediate assistance in recovering your account.'
  },
];


// --- Sub-Components ---

const ContactCard = ({ method }: { method: typeof contactMethods[0] }) => {
  const IconComponent = method.icon;
  return (
    <a
      href={method.href}
      className={`bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl border-l-4 ${method.hover} border-transparent transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col`}
    >
      <div className={`w-12 h-12 ${method.color} rounded-xl flex items-center justify-center mb-4 flex-shrink-0`}>
        <IconComponent className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
        {method.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
        {method.description}
      </p>
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
          <Link className="h-4 w-4" />
          {method.linkText}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{method.contact}</p>
      </div>
    </a>
  );
};

const ResourceCard = ({ resource }: { resource: typeof coreNavigation[0] }) => {
  const IconComponent = resource.icon;
  return (
    <a
      href={resource.href}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-xl transform transition-all duration-200 block group"
    >
      <div className="flex items-start gap-4">
        <IconComponent className={`h-8 w-8 ${resource.color} flex-shrink-0`} />
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
            {resource.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {resource.description}
          </p>
        </div>
      </div>
    </a>
  );
};

// --- Main Component ---

function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-inter">
      {/* Navbar (assumed fixed/sticky) */}
      <Navbar />

      {/* Main Content - PADDING FIX: pt-28 ensures content clears fixed Navbar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        
        
          
            {/* Hero Section */}
                      <div className="text-center mb-16 print:mb-8">
                        <div className="flex justify-center mb-6 print:hidden">
                          <div className="w-20 h-20 bg-[#0f7cff] rounded-3xl flex items-center justify-center">
                            <HelpCircle className="h-10 w-10 text-white" />
                          </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-2">
                          NUNSA IELCOM SUPPORT CENTER
                        </h1>
                       
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mt-4 print:text-base print:text-black">
            We are dedicated to ensuring a seamless experience in the NUNSA Electoral System. Find quick answers, key resources, or reach out directly to our team.
                        </p>
            
        </div>

       

        {/* ------------------------------------------------------------------ */}
        {/* NEW SECTION: COMPREHENSIVE GUIDES                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center border-b pb-3">
            Comprehensive Guides
          </h2>
          
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Guide 1: Voter Registration */}
            <details 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 group overflow-hidden"
              open // Open by default for prominence
            >
              <summary className="p-5 sm:p-6 cursor-pointer list-none flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 transition-colors duration-150 border-b-2 border-indigo-200">
                <div className="flex items-center gap-3">
                    <UserCheck className="h-6 w-6 text-indigo-600" />
                    <span className="text-lg sm:text-xl font-bold text-indigo-800 dark:text-indigo-200">
                        Voter Registration Guide
                    </span>
                </div>
                <ChevronDown className="h-5 w-5 text-indigo-600 transform transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="p-5 sm:p-6 bg-white dark:bg-gray-800">
                <p className="mb-4 font-semibold text-gray-700 dark:text-gray-300">
                    Ready to cast your ballot? Follow these steps to ensure you are successfully registered and eligible to vote.
                </p>
                
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">The 3-Step Process:</h4>
                <ol className="list-decimal list-inside space-y-3 pl-4 text-gray-600 dark:text-gray-400">
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Account Sign-up:</span> Visit the <a href="/register" className="text-indigo-600 hover:underline">Registration Portal</a> and complete the initial form with your personal and academic details.
                    </li>
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Email Verification:</span> An email containing a verification link will be sent to the address you provided. You must click this link to confirm your ownership and proceed to the next step.
                    </li>
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Biometric Authentication:</span> For secure voting, you will be required to set up your Biometric (Fingerprint/Face) ID OR OTP Fallback via Email. This is crucial for logging in on Election Day and preventing voter fraud. Follow the on-screen prompts carefully.
                    </li>
                </ol>

                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-bold">Important Note:</p>
                    <p>Registration is only valid during the official registration period. Your eligibility is subject to verification by the IELCOM based on your academic status and the NUNSA Constitution</p>
                </div>
              </div>
            </details>

            {/* Guide 2: Aspirant Application */}
            <details 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 group overflow-hidden"
            >
              <summary className="p-5 sm:p-6 cursor-pointer list-none flex justify-between items-center bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100 transition-colors duration-150 border-b-2 border-teal-200">
                <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-teal-600" />
                    <span className="text-lg sm:text-xl font-bold text-teal-800 dark:text-teal-200">
                        Aspirant Application Guide
                    </span>
                </div>
                <ChevronDown className="h-5 w-5 text-teal-600 transform transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="p-5 sm:p-6 bg-white dark:bg-gray-800">
                <p className="mb-4 font-semibold text-gray-700 dark:text-gray-300">
                    Applying for a leadership position involves several key stages. Be diligent and complete all requirements before the deadline.
                </p>
                
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">The Application Journey:</h4>
                <ol className="list-decimal list-inside space-y-3 pl-4 text-gray-600 dark:text-gray-400">
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Eligibility Check:</span> Review the Electoral Rules (<a href="/rules" className="text-indigo-600 hover:underline">link</a>) to confirm your CGPA and academic level meet the requirements for your desired position.
                    </li>
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Application Fee Payment:</span> Pay the required fee through the portal. This step must be completed before accessing the main form.
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <CreditCard className="w-4 h-4" /> Proof of payment is automatically recorded.
                        </div>
                    </li>
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Form Submission & Documents:</span> Fill out the multi-step form and upload all required supporting documents (e.g., academic transcript, manifesto). Ensure all files are clear and correctly named.
                    </li>
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Final Review:</span> Before submitting, use the Review tab to check every detail. Once submitted, the application is locked.
                    </li>
                    <li>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Tracking Status:</span> After submission, your status will change from Pending to Under Review. Check your Aspirant Dashboard regularly for updates (e.g., Approved, Disqualified, Vetted).
                    </li>
                </ol>

                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg text-sm text-red-800 dark:text-red-300">
                    <p className="font-bold">Disqualification Risk:</p>
                    <p>Incomplete forms, failure to pay the fee, or submission of fraudulent documents will result in immediate disqualification.</p>
                </div>
              </div>
            </details>

          </div>
        </div>
        {/* ------------------------------------------------------------------ */}

        
        {/* FAQs - Enhanced Accordion */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center border-b pb-3">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <details 
                key={index} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 group overflow-hidden"
              >
                <summary className="p-5 sm:p-6 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {faq.question}
                  </span>
                  <ChevronDown className="h-5 w-5 text-indigo-500 transform transition-transform duration-200 group-open:rotate-180" />
                </summary>
                {/* The content div ensures clean padding when opened */}
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base pt-2">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
        
        {/* Contact Methods */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center border-b pb-3">
            Get In Touch
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <ContactCard key={index} method={method} />
            ))}
          </div>
        </div>

        {/* Emergency Contact (using the Contact placeholder component) */}
        <div className="mb-16">
          <Contact /> 
        </div>

         {/* Quick Resources / Core Navigation */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center border-b pb-3">
            Quick Navigation
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreNavigation.map((resource, index) => (
              <ResourceCard key={index} resource={resource} />
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default SupportPage;