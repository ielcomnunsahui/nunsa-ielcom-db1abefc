import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, FileText, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";

interface AuditLog {
  id: string;
  event_type: string;
  actor_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (eventTypeFilter !== "all") {
      filtered = filtered.filter((log) => log.event_type === eventTypeFilter);
    }

    setFilteredLogs(filtered);
  }, [searchTerm, eventTypeFilter, logs]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      vote_cast: "default",
      voter_registered: "secondary",
      admin_action: "destructive",
    };

    return (
      <Badge variant={variants[eventType] || "secondary"}>
        {eventType.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const uniqueEventTypes = Array.from(new Set(logs.map((log) => log.event_type)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        
        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {uniqueEventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Audit Trail</h3>
            <p className="text-sm text-muted-foreground">
              All system actions are logged here for transparency and security. 
              Showing the last 500 events.
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actor ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {searchTerm || eventTypeFilter !== "all" 
                    ? "No logs found matching your filters." 
                    : "No audit logs recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{getEventTypeBadge(log.event_type)}</TableCell>
                  <TableCell>
                    {log.description || (
                      <span className="text-muted-foreground italic">No description</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.actor_id ? (
                      log.actor_id.slice(0, 8) + "..."
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        Displaying {filteredLogs.length} of {logs.length} total logs
      </div>
    </div>
  );
}
