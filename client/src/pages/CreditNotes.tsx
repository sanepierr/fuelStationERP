import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const statusColors: Record<string, string> = { draft: 'badge-inactive', issued: 'badge-info', applied: 'badge-active', void: 'badge-danger' };

export default function CreditNotes() {
  const [stationId, setStationId] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: creditNotes, isLoading, refetch } = trpc.creditNotes.list.useQuery({ stationId: activeStationId });
  const createCN = trpc.creditNotes.create.useMutation({ onSuccess: () => { toast.success("Credit note created"); setAddOpen(false); refetch(); } });
  const { register, handleSubmit } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credit Notes</h1>
          <p className="text-muted-foreground text-sm">Issue credit notes to your customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New Credit Note</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Issue Credit Note</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createCN.mutate({ stationId: activeStationId, customerName: d.customerName, amount: d.amount, reason: d.reason }))} className="space-y-4">
                <div><Label>Customer Name *</Label><Input {...register("customerName", { required: true })} className="bg-input border-border" /></div>
                <div><Label>Customer Phone</Label><Input {...register("customerPhone")} placeholder="+256..." className="bg-input border-border" /></div>
                <div><Label>Amount (UGX) *</Label><Input {...register("amount", { required: true })} type="number" className="bg-input border-border" /></div>
                <div><Label>Reason *</Label>
                  <select {...register("reason", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="overpayment">Overpayment</option>
                    <option value="product_return">Product Return</option>
                    <option value="service_error">Service Error</option>
                    <option value="discount">Discount</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Notes</Label><Textarea {...register("notes")} className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={createCN.isPending}>Issue Credit Note</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">CN #</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Customer</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Reason</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Print</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : creditNotes?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No credit notes yet</p></td></tr>
              ) : creditNotes?.map(cn => (
                <tr key={cn.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{cn.creditNoteNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{cn.customerName}</p>

                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">UGX {parseFloat(cn.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{cn.reason?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusColors[cn.status] || 'badge-inactive'}>{cn.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(cn.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
