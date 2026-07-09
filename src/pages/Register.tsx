import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import RegistrationFlow from "@/components/RegistrationFlow";

const Register = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 px-4 pb-12">
        <div className="container mx-auto max-w-md">
          <Card className="p-8 animate-fade-in">
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-primary rounded-full shadow-glow mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <RegistrationFlow />
            <div className="mt-8 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-foreground">Security Notice</h4>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>Your matric number is verified against the admin-uploaded eligible voter list.</li>
                <li>Only eligible students can register.</li>
                <li>Do not share your password or verification code with anyone.</li>
              </ul>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Register;
