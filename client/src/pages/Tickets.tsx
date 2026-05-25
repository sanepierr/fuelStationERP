import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TicketCheck, Plus, Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const priorityColors: Record<string, string> = {
  low: 'badge-inactive', medium: 'badge-info', high: 'badge-warning', urgent: 'badge-danger',
};
const statusColors: Record<string, string> = {
  open: 'badge-info', in_progress: 'badge-warning', resolved: 'badge-active', closed: 'badge-inactive',
};

export default function Tickets() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: tickets, isLoading, refetch } = trpc.tickets.list.useQuery({ status: statusFilter as any || undefined });  
  const { data: stations } = trpc.stations.list.useQuery();
  const createTicket = trpc.tickets.create.useMutation({ onSuccess: () => { toast.success("Ticket created"); setAddOpen(false); refetch(); } });
  const { register, handleSubmit } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground text-sm">Raise and track support requests</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New Ticket</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(d => createTicket.mutate({ title: d.title, description: d.description, priority: d.priority, category: d.category, stationId: d.stationId ? parseInt(d.stationId) : undefined }))} className="space-y-4">
              <div><Label>Title *</Label><Input {...register("title", { required: true })} placeholder="Brief description of the issue" className="bg-input border-border" /></div>
              <div><Label>Description *</Label><Textarea {...register("description", { required: true })} placeholder="Detailed description..." className="bg-input border-border min-h-[100px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Priority</Label>
                  <select {...register("priority")} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div><Label>Category</Label>
                  <select {...register("category")} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div><Label>Station</Label>
                <select {...register("stationId")} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                  <option value="">General (No specific station)</option>
                  {stations?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createTicket.isPending}>Submit Ticket</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-9 bg-input border-border" />
        </div>
        <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 bg-input border-border"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Card key={i} className="h-20 animate-pulse bg-card border-border" />)}</div>
      ) : tickets?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TicketCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets?.map(ticket => (
            <Card key={ticket.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">#{ticket.ticketNumber}</span>
                      <Badge variant="outline" className={priorityColors[ticket.priority] || 'badge-inactive'}>{ticket.priority}</Badge>
                      <Badge variant="outline" className={statusColors[ticket.status] || 'badge-inactive'}>{ticket.status.replace(/_/g, ' ')}</Badge>
                      {ticket.category && <Badge variant="outline" className="badge-info text-xs">{ticket.category}</Badge>}
                    </div>
                    <h3 className="font-semibold text-foreground">{ticket.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground ml-4">
                    <p>{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <MessageSquare className="w-3 h-3" />
                      <span>0</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
