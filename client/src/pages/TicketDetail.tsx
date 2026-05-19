import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const priorityColors: Record<string, string> = { low: 'badge-inactive', medium: 'badge-info', high: 'badge-warning', urgent: 'badge-danger' };
const statusColors: Record<string, string> = { open: 'badge-info', in_progress: 'badge-warning', resolved: 'badge-active', closed: 'badge-inactive' };

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const ticketId = parseInt(id || '1');
  const [reply, setReply] = useState('');
  const { data: ticket, isLoading, refetch } = trpc.tickets.get.useQuery({ id: ticketId });
  const addReply = trpc.tickets.addComment.useMutation({ onSuccess: () => { toast.success("Reply added"); setReply(''); refetch(); } });
  const updateStatus = trpc.tickets.update.useMutation({ onSuccess: () => { toast.success("Status updated"); refetch(); } });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Ticket not found</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">#{ticket.ticketNumber}</span>
            <Badge variant="outline" className={priorityColors[ticket.priority] || 'badge-inactive'}>{ticket.priority}</Badge>
            <Badge variant="outline" className={statusColors[ticket.status] || 'badge-inactive'}>{ticket.status.replace(/_/g, ' ')}</Badge>
          </div>
          <h1 className="text-xl font-bold text-foreground">{ticket.title}</h1>
        </div>
        {['admin', 'owner', 'manager', 'technician'].includes(user?.role || '') && (
          <Select value={ticket.status} onValueChange={v => updateStatus.mutate({ id: ticketId, status: v as any })}>
            <SelectTrigger className="w-36 bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Category: {ticket.category}</span>
            <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />Replies ({(ticket.comments as any[])?.length || 0})
        </h3>
        {(ticket.comments as any[])?.map((r: any) => (
          <Card key={r.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary">User #{r.userId}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." className="bg-input border-border min-h-[80px] mb-3" />
          <Button onClick={() => { if (reply.trim()) addReply.mutate({ ticketId, comment: reply }); }} disabled={addReply.isPending || !reply.trim()} className="gap-2">
            <Send className="w-4 h-4" />Send Reply
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
