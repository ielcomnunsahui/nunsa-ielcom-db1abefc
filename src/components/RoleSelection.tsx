import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Trophy, Shield } from "lucide-react";

interface RoleSelectionProps {
  user: any;
  onRoleAssigned: () => void;
}

const RoleSelection = ({ user, onRoleAssigned }: RoleSelectionProps) => {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [voterData, setVoterData] = useState({
    matric: "",
    name: "",
  });
  const { toast } = useToast();

  const handleRoleAssignment = async () => {
    if (!selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select a role to continue",
        variant: "destructive",
      });
      return;
    }

    if (selectedRole === "voter" && (!voterData.matric || !voterData.name)) {
      toast({
        title: "Information Required",
        description: "Please provide your matric number and full name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("assign-user-role", {
        body: {
          userId: user.id,
          role: selectedRole,
          userData: selectedRole === "voter" ? voterData : {},
        },
      });

      if (error) throw error;

      toast({
        title: "Role Assigned Successfully",
        description: `You have been registered as a ${selectedRole}. You can now access the platform.`,
      });

      onRoleAssigned();
    } catch (error) {
      console.error("Role assignment error:", error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-primary rounded-full shadow-glow mb-4">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Choose Your Role
          </h1>
          <p className="text-muted-foreground">
            Welcome! Please select your role to continue using the platform.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="role">Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voter">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Voter - Participate in elections</span>
                  </div>
                </SelectItem>
                <SelectItem value="aspirant">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4" />
                    <span>Aspirant - Run for positions</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Admin - Manage elections</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole === "voter" && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-sm">Voter Information</h3>
              <div className="space-y-2">
                <Label htmlFor="matric">Matric Number</Label>
                <Input
                  id="matric"
                  type="text"
                  placeholder="21/08nus014"
                  value={voterData.matric}
                  onChange={(e) => setVoterData(prev => ({ ...prev, matric: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format: 21/08nus014
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={voterData.name}
                  onChange={(e) => setVoterData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          {selectedRole === "aspirant" && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">Aspirant Information</h3>
              <p className="text-xs text-muted-foreground">
                You'll be able to complete your aspirant profile and submit applications after role assignment.
              </p>
            </div>
          )}

          {selectedRole === "admin" && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">Admin Access</h3>
              <p className="text-xs text-muted-foreground">
                Admin role provides access to election management features.
              </p>
            </div>
          )}

          <Button
            onClick={handleRoleAssignment}
            className="w-full bg-gradient-primary"
            disabled={isLoading || !selectedRole}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning Role...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 text-foreground">Role Descriptions</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>Voter:</strong> Participate in elections and vote for candidates</li>
            <li><strong>Aspirant:</strong> Apply for leadership positions and run campaigns</li>
            <li><strong>Admin:</strong> Manage elections, candidates, and system settings</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default RoleSelection;