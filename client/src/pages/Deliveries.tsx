import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Plus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const statusColors: Record<string, string> = {
  ordered: 'badge-info', dispatched: 'badge-warning', in_transit: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  delivered: 'badge-active', verified: 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30', cancelled: 'badge-inactive',
};

const statusFlow = ['ordered', 'dispatched', 'in_transit', 'delivered', 'verified'];

export default function Deliveries() {
  const [stationId, setStationId] = useState<string>('');
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: deliveries, isLoading, refetch } = trpc.deliveries.list.useQuery({ stationId: activeStationId });
  const { data: tanks } = trpc.tanks.forStation.useQuery({ stationId: activeStationId });
  const { data: fuelTypes } = trpc.fuelTypes.list.useQuery();
  const [addOpen, setAddOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState<any>(null);
  const createDelivery = trpc.deliveries.create.useMutation({ onSuccess: () => { toast.success("Delivery order created"); setAddOpen(false); refetch(); } });
  const updateStatus = trpc.deliveries.updateStatus.useMutation({ onSuccess: () => { toast.success("Status updated"); setUpdateOpen(null); refetch(); } });
  const { register, handleSubmit } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fuel Deliveries</h1>
          <p className="text-muted-foreground text-sm">Track fuel from depot to station — full chain of custody</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New Delivery Order</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Create Delivery Order</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createDelivery.mutate({ stationId: activeStationId, tankId: parseInt(d.tankId), fuelTypeId: parseInt(d.fuelTypeId), orderedVolume: d.orderedVolume, depotName: d.depotName, supplierName: d.supplierName, truckNumber: d.truckNumber, driverName: d.driverName, pricePerLitre: d.pricePerLitre }))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Tank</Label>
                    <select {...register("tankId", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                      {tanks?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Fuel Type</Label>
                    <select {...register("fuelTypeId", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                      {fuelTypes?.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Ordered Volume (L)</Label><Input {...register("orderedVolume", { required: true })} type="number" placeholder="10000" className="bg-input border-border" /></div>
                  <div><Label>Price/Litre (UGX)</Label><Input {...register("pricePerLitre")} type="number" placeholder="Optional" className="bg-input border-border" /></div>
                  <div><Label>Depot Name</Label><Input {...register("depotName")} placeholder="e.g. Jinja Depot" className="bg-input border-border" /></div>
                  <div><Label>Supplier</Label><Input {...register("supplierName")} placeholder="Supplier name" className="bg-input border-border" /></div>
                  <div><Label>Truck Number</Label><Input {...register("truckNumber")} placeholder="e.g. UAX 123B" className="bg-input border-border" /></div>
                  <div><Label>Driver Name</Label><Input {...register("driverName")} placeholder="Driver name" className="bg-input border-border" /></div>
                </div>
                <Button type="submit" className="w-full" disabled={createDelivery.isPending}>Create Order</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Card key={i} className="h-24 animate-pulse bg-card border-border" />)}</div>
      ) : deliveries?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Truck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No deliveries yet</p></div>
      ) : (
        <div className="space-y-3">
          {deliveries?.map(d => (
            <Card key={d.id} className="bg-card border-border card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-primary">{d.deliveryOrderNumber}</span>
                        <Badge variant="outline" className={statusColors[d.status] || 'badge-inactive'}>{d.status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{parseFloat(d.orderedVolume).toLocaleString()}L ordered</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {d.depotName && <span>From: {d.depotName}</span>}
                        {d.truckNumber && <span>Truck: {d.truckNumber}</span>}
                        {d.driverName && <span>Driver: {d.driverName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(d.createdAt).toLocaleDateString()}</p>
                      {d.receivedVolume && <p className="text-emerald-400">{parseFloat(d.receivedVolume).toLocaleString()}L received</p>}
                    </div>
                    {d.status !== 'verified' && d.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setUpdateOpen(d)}>
                        Update <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Progress */}
                <div className="mt-3 flex items-center gap-1">
                  {statusFlow.map((s, i) => {
                    const currentIdx = statusFlow.indexOf(d.status);
                    return (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`h-1.5 flex-1 rounded-full ${i <= currentIdx ? 'bg-primary' : 'bg-muted'}`} />
                        {i < statusFlow.length - 1 && <div className={`w-1.5 h-1.5 rounded-full ${i < currentIdx ? 'bg-primary' : 'bg-muted'}`} />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Status Dialog */}
      <Dialog open={!!updateOpen} onOpenChange={() => setUpdateOpen(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Update Delivery Status</DialogTitle></DialogHeader>
          {updateOpen && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Order: <span className="font-mono text-primary">{updateOpen.deliveryOrderNumber}</span></p>
              <div className="grid grid-cols-2 gap-2">
                {statusFlow.filter(s => statusFlow.indexOf(s) > statusFlow.indexOf(updateOpen.status)).map(s => (
                  <Button key={s} variant="outline" className="capitalize" onClick={() => updateStatus.mutate({ id: updateOpen.id, status: s as any })}>
                    Mark as {s.replace(/_/g, ' ')}
                  </Button>
                ))}
                <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => updateStatus.mutate({ id: updateOpen.id, status: 'cancelled' })}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
