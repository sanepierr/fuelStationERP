import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Play, Square, Plus, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function Shifts() {
  const [stationId, setStationId] = useState<string>('');
  const [startOpen, setStartOpen] = useState(false);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: shifts, isLoading, refetch } = trpc.shifts.list.useQuery({ stationId: activeStationId });
  const { data: activeShift } = trpc.shifts.active.useQuery({ stationId: activeStationId });
  const startShift = trpc.shifts.start.useMutation({ onSuccess: () => { toast.success("Shift started"); setStartOpen(false); refetch(); } });
  const endShift = trpc.shifts.close.useMutation({ onSuccess: () => { toast.success("Shift ended"); refetch(); } });
  const { register, handleSubmit } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shift Management</h1>
          <p className="text-muted-foreground text-sm">Track and manage station shifts with end-of-shift reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          {!activeShift && (
            <Dialog open={startOpen} onOpenChange={setStartOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Play className="w-4 h-4" />Start Shift</Button></DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Start New Shift</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(d => startShift.mutate({ stationId: activeStationId, shiftName: d.shiftName, openingCash: d.openingCash || '0' }))} className="space-y-4">
                  <div><Label>Shift Name</Label>
                    <select {...register("shiftName", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                      <option value="Morning">Morning Shift</option>
                      <option value="Afternoon">Afternoon Shift</option>
                      <option value="Night">Night Shift</option>
                    </select>
                  </div>
                  <div><Label>Opening Cash (UGX)</Label><Input {...register("openingCash")} type="number" defaultValue="0" className="bg-input border-border" /></div>
                  <Button type="submit" className="w-full" disabled={startShift.isPending}>Start Shift</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {activeShift && (
            <Button variant="destructive" className="gap-2" onClick={() => { if (confirm('End current shift?')) endShift.mutate({ shiftId: activeShift.id, closingCash: '0' }); }}>
              <Square className="w-4 h-4" />End Shift
            </Button>
          )}
        </div>
      </div>

      {activeShift && (
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="font-semibold text-emerald-600">{activeShift.shiftName} — Active</p>
                  <p className="text-xs text-muted-foreground">Started: {new Date(activeShift.startTime).toLocaleString()} </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">UGX {parseFloat(activeShift.totalSales || '0').toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Sales so far</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm">Shift History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Shift</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Supervisor</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Start</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">End</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Sales</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Transactions</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Report</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : shifts?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground"><Clock className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No shifts recorded</p></td></tr>
              ) : shifts?.map(shift => (
                <tr key={shift.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium text-foreground">{shift.shiftName}</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(shift.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{shift.endTime ? new Date(shift.endTime).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">UGX {parseFloat(shift.totalSales || '0').toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={shift.status === 'active' ? 'badge-active' : shift.status === 'closed' ? 'badge-inactive' : 'badge-warning'}>{shift.status}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.print()}>
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
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
