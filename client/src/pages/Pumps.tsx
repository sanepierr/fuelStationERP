import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel, Plus, Settings, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function Pumps() {
  const [stationId, setStationId] = useState<string>('');
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: pumps, isLoading, refetch } = trpc.pumps.forStation.useQuery({ stationId: activeStationId });
  const { data: tanks } = trpc.tanks.forStation.useQuery({ stationId: activeStationId });
  const [addOpen, setAddOpen] = useState(false);
  const createPump = trpc.pumps.create.useMutation({ onSuccess: () => { toast.success("Pump created"); setAddOpen(false); refetch(); } });
  const updateStatus = trpc.pumps.updateStatus.useMutation({ onSuccess: () => { toast.success("Status updated"); refetch(); } });
  const { register, handleSubmit } = useForm();

  const statusColors: Record<string, string> = {
    active: 'badge-active', inactive: 'badge-inactive', maintenance: 'badge-warning', fault: 'badge-danger'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pump Management</h1>
          <p className="text-muted-foreground text-sm">Monitor and control all fuel dispensing pumps</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Pump</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add Pump</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createPump.mutate({ name: d.name, stationId: activeStationId, tankId: parseInt(d.tankId), serialNumber: d.serialNumber, nozzleCount: parseInt(d.nozzleCount) || 1 }))} className="space-y-4">
                <div><Label>Pump Name</Label><Input {...register("name", { required: true })} placeholder="e.g. Pump 1" className="bg-input border-border" /></div>
                <div><Label>Tank</Label>
                  <select {...register("tankId", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    {tanks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div><Label>Serial Number</Label><Input {...register("serialNumber")} placeholder="Optional" className="bg-input border-border" /></div>
                <div><Label>Nozzle Count</Label><Input {...register("nozzleCount")} type="number" defaultValue="1" className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={createPump.isPending}>Add Pump</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Card key={i} className="h-40 animate-pulse bg-card border-border" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pumps?.map(pump => (
            <Card key={pump.id} className="bg-card border-border card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pump.status === 'active' ? 'bg-emerald-500/20' : pump.status === 'fault' ? 'bg-red-500/20' : 'bg-muted'}`}>
                    <Fuel className={`w-6 h-6 ${pump.status === 'active' ? 'text-emerald-600' : pump.status === 'fault' ? 'text-red-600' : 'text-muted-foreground'}`} />
                  </div>
                  <Badge variant="outline" className={statusColors[pump.status] || 'badge-inactive'}>{pump.status}</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{pump.name}</h3>
                <p className="text-xs text-muted-foreground">S/N: {pump.serialNumber || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{pump.nozzleCount} nozzle{pump.nozzleCount > 1 ? 's' : ''}</p>
                <div className="mt-3 flex gap-1">
                  {(['active', 'inactive', 'maintenance', 'fault'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus.mutate({ pumpId: pump.id, status: s })}
                      className={`flex-1 text-xs py-1 rounded transition-colors ${pump.status === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}
                    >
                      {s.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )) || <div className="col-span-4 text-center py-16 text-muted-foreground"><Fuel className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No pumps configured</p></div>}
        </div>
      )}
    </div>
  );
}
