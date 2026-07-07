import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, UserCheck, Vote, BarChart3 } from "lucide-react";
import { VoterAnalytics } from "@/utils/levelCalculator";

interface VoterAnalyticsCardProps {
  analytics: VoterAnalytics[];
  isLoading?: boolean;
}

export function VoterAnalyticsCard({ analytics, isLoading = false }: VoterAnalyticsCardProps) {
  const totalEligible = analytics.reduce((sum, data) => sum + data.totalEligible, 0);
  const totalRegistered = analytics.reduce((sum, data) => sum + data.totalRegistered, 0);
  const totalVerified = analytics.reduce((sum, data) => sum + data.totalVerified, 0);
  const totalVoted = analytics.reduce((sum, data) => sum + data.totalVoted, 0);

  const overallRegistrationRate = totalEligible > 0 ? (totalRegistered / totalEligible) * 100 : 0;
  const overallVerificationRate = totalRegistered > 0 ? (totalVerified / totalRegistered) * 100 : 0;
  const overallTurnoutRate = totalVerified > 0 ? (totalVoted / totalVerified) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Voter Analytics by Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-t-4 border-blue-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Voter Analytics by Level
        </CardTitle>
        <CardDescription>
          Registration, verification, and turnout rates across academic levels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <Users className="w-4 h-4" />
              Eligible
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalEligible}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              Registered
            </div>
            <div className="text-2xl font-bold text-green-600">{totalRegistered}</div>
            <div className="text-xs text-gray-500">{overallRegistrationRate.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <UserCheck className="w-4 h-4" />
              Verified
            </div>
            <div className="text-2xl font-bold text-orange-600">{totalVerified}</div>
            <div className="text-xs text-gray-500">{overallVerificationRate.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <Vote className="w-4 h-4" />
              Voted
            </div>
            <div className="text-2xl font-bold text-purple-600">{totalVoted}</div>
            <div className="text-xs text-gray-500">{overallTurnoutRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Level-by-Level Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 border-b pb-2">Level-by-Level Breakdown</h4>
          {analytics.map((data) => (
            <div key={data.level} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold">
                    {data.level}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {data.totalEligible} eligible students
                  </span>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>Turnout: <span className="font-semibold text-purple-600">{data.turnoutRate.toFixed(1)}%</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Registration Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Registration</span>
                    <span className="font-medium">{data.totalRegistered}/{data.totalEligible}</span>
                  </div>
                  <Progress value={data.registrationRate} className="h-2" />
                  <div className="text-xs text-gray-500 text-right">
                    {data.registrationRate.toFixed(1)}%
                  </div>
                </div>

                {/* Verification Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verification</span>
                    <span className="font-medium">{data.totalVerified}/{data.totalRegistered}</span>
                  </div>
                  <Progress value={data.verificationRate} className="h-2" />
                  <div className="text-xs text-gray-500 text-right">
                    {data.verificationRate.toFixed(1)}%
                  </div>
                </div>

                {/* Voting Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Voting</span>
                    <span className="font-medium">{data.totalVoted}/{data.totalVerified}</span>
                  </div>
                  <Progress value={data.turnoutRate} className="h-2" />
                  <div className="text-xs text-gray-500 text-right">
                    {data.turnoutRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {analytics.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No analytics data available</p>
            <p className="text-sm">Upload student roster and wait for voter registrations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}