import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, Plus, Wrench, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function RTT() {
  const [stationId, setStationId] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: rttRecords, isLoading, refetch } = trpc.rtt.list.useQuery({ stationId: activeStationId });
  const createRTT = trpc.rtt.create.useMutation({ onSuccess: () => { toast.success("RTT record created"); setAddOpen(false); refetch(); } });
  const { register, handleSubmit } = useForm();

  const totalRTT = rttRecords?.reduce((s: number, r: any) => s + parseFloat(r.volume || '0'), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Return to Tank (RTT)</h1>
          <p className="text-muted-foreground text-sm">Track fuel returned to tanks during maintenance, calibration, and technician work</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Log RTT</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Log Return to Tank Transaction</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createRTT.mutate({ stationId: activeStationId, pumpId: parseInt(d.pumpId) || undefined, volume: d.volume, reason: d.reason }))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Tank ID *</Label><Input {...register("tankId", { required: true })} type="number" placeholder="Tank ID" className="bg-input border-border" /></div>
                  <div><Label>Pump ID *</Label><Input {...register("pumpId", { required: true })} type="number" placeholder="Pump ID" className="bg-input border-border" /></div>
                </div>
                <div><Label>Volume (Litres) *</Label><Input {...register("volume", { required: true })} type="number" step="0.01" placeholder="0.00" className="bg-input border-border" /></div>
                <div><Label>Reason *</Label>
                  <select {...register("reason", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="maintenance">Pump Maintenance</option>
                    <option value="calibration">Meter Calibration</option>
                    <option value="testing">System Testing</option>
                    <option value="repair">Pump Repair</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Technician Name</Label><Input {...register("technicianName")} placeholder="Name of technician" className="bg-input border-border" /></div>
                <div><Label>Notes</Label><Textarea {...register("notes")} className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={createRTT.isPending}>Log RTT Transaction</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-xs text-muted-foreground">Total RTT Volume</span></div>
            <p className="text-2xl font-bold text-amber-400">{totalRTT.toFixed(2)}L</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><RefreshCw className="w-4 h-4 text-blue-400" /><span className="text-xs text-muted-foreground">Total Records</span></div>
            <p className="text-2xl font-bold text-foreground">{rttRecords?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Wrench className="w-4 h-4 text-orange-400" /><span className="text-xs text-muted-foreground">Pending Approval</span></div>
            <p className="text-2xl font-bold text-foreground">{rttRecords?.filter((r: any) => r.status === 'pending').length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm">RTT Transaction Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tank/Pump</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Volume</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Reason</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Technician</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : rttRecords?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No RTT records</p></td></tr>
              ) : rttRecords?.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground">Tank #{r.tankId} / Pump #{r.pumpId}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">{parseFloat(r.volume).toFixed(2)}L</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{r.reason?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.technicianName || '—'}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={r.status === 'approved' ? 'badge-active' : r.status === 'pending' ? 'badge-warning' : 'badge-inactive'}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
