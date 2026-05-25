import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Plus, RefreshCw, AlertTriangle, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function TankCard({ tank, onUpdate }: { tank: any; onUpdate: () => void }) {
  const pct = Math.min(100, Math.max(0, (parseFloat(tank.currentLevel) / parseFloat(tank.capacity)) * 100));
  const [showReadings, setShowReadings] = useState(false);
  const { data: readings } = trpc.tanks.readings.useQuery({ tankId: tank.id, limit: 24 }, { enabled: showReadings });
  const updateLevel = trpc.tanks.updateLevel.useMutation({ onSuccess: () => { toast.success("Tank level updated"); onUpdate(); } });
  const [newLevel, setNewLevel] = useState('');

  const statusConfig: Record<string, { class: string; label: string }> = {
    normal: { class: 'badge-active', label: 'Normal' },
    low: { class: 'badge-warning', label: 'Low' },
    critical: { class: 'badge-danger', label: 'Critical' },
    overfill: { class: 'badge-info', label: 'Overfill' },
    maintenance: { class: 'badge-inactive', label: 'Maintenance' },
  };
  const sc = statusConfig[tank.status] || statusConfig.normal;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">{tank.name}</h3>
            <p className="text-xs text-muted-foreground">Capacity: {parseFloat(tank.capacity).toLocaleString()}L</p>
          </div>
          <div className="flex items-center gap-2">
            {tank.status === 'critical' && <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />}
            <Badge variant="outline" className={sc.class}>{sc.label}</Badge>
          </div>
        </div>

        {/* Visual Tank */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex gap-1">
            {/* Tick marks */}
            <div className="flex flex-col justify-between py-1 h-28">
              {[100, 75, 50, 25, 0].map(v => (
                <div key={v} className="flex items-center gap-0.5">
                  <span className="text-[9px] text-muted-foreground w-4 text-right leading-none">{v}</span>
                  <div className="w-1.5 h-px bg-border" />
                </div>
              ))}
            </div>
            {/* Tank body */}
            <div className="relative w-12 h-28 rounded-b-lg rounded-t-sm border-2 border-border bg-muted overflow-hidden"
              style={{ borderColor: pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444' }}>
              {/* Fill */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-700"
                style={{
                  height: `${pct}%`,
                  background: pct > 50
                    ? 'linear-gradient(to top, #16a34a, #4ade80)'
                    : pct > 20
                    ? 'linear-gradient(to top, #d97706, #fbbf24)'
                    : 'linear-gradient(to top, #dc2626, #f87171)',
                }}
              >
                {/* Wave shimmer */}
                <div className="absolute top-0 left-0 right-0 h-2 opacity-40"
                  style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)' }} />
              </div>
              {/* Percentage label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-white drop-shadow-lg">{Math.round(pct)}%</span>
              </div>
              {/* Min level marker */}
              {tank.minLevel && (
                <div className="absolute left-0 right-0 border-t border-dashed border-white/60"
                  style={{ bottom: `${Math.min(100, (parseFloat(tank.minLevel) / parseFloat(tank.capacity)) * 100)}%` }} />
              )}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-bold text-foreground">{parseFloat(tank.currentLevel).toLocaleString()}L</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Capacity</span>
              <span className="text-foreground">{parseFloat(tank.capacity).toLocaleString()}L</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="text-primary font-medium">{(parseFloat(tank.capacity) - parseFloat(tank.currentLevel)).toLocaleString()}L</span>
            </div>
            {tank.minLevel && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Level</span>
                <span className={parseFloat(tank.currentLevel) <= parseFloat(tank.minLevel) ? 'text-red-600' : 'text-muted-foreground'}>
                  {parseFloat(tank.minLevel).toLocaleString()}L
                </span>
              </div>
            )}
          </div>
        </div>

        {tank.atgSensorId && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-600">ATG Sensor: {tank.atgSensorId}</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 flex gap-1">
            <Input
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
              placeholder="New level (L)"
              className="bg-input border-border text-xs h-8"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => { if (newLevel) { updateLevel.mutate({ tankId: tank.id, level: newLevel, source: 'manual' }); setNewLevel(''); } }}
              disabled={updateLevel.isPending}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowReadings(!showReadings)}>
            History
          </Button>
        </div>

        {showReadings && readings && readings.length > 0 && (
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={readings.slice().reverse().map(r => ({ time: new Date(r.recordedAt).toLocaleTimeString(), level: parseFloat(r.level) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11 }} />
                <Area type="monotone" dataKey="level" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Tanks() {
  const [stationId, setStationId] = useState<string>('');
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: tanks, isLoading, refetch } = trpc.tanks.forStation.useQuery({ stationId: activeStationId }, { refetchInterval: 30000 });
  const [addOpen, setAddOpen] = useState(false);
  const { data: fuelTypes } = trpc.fuelTypes.list.useQuery();
  const createTank = trpc.tanks.create.useMutation({ onSuccess: () => { toast.success("Tank created"); setAddOpen(false); refetch(); } });
  const { register, handleSubmit, reset } = useForm();

  const alerts = tanks?.filter(t => ['low', 'critical'].includes(t.status)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tank Gauge Monitor</h1>
          <p className="text-muted-foreground text-sm">Real-time ATG integration & manual readings</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border">
              <SelectValue placeholder="Select station" />
            </SelectTrigger>
            <SelectContent>
              {stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Live
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Tank</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add Tank</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createTank.mutate({ name: d.name, stationId: activeStationId, capacity: String(d.capacity), fuelTypeId: parseInt(d.fuelTypeId), minLevel: d.minLevel ? String(d.minLevel) : undefined, atgSensorId: d.atgSensorId || undefined }))} className="space-y-4">
                <div><Label>Tank Name</Label><Input {...register("name", { required: true })} placeholder="e.g. Tank 1 - Petrol" className="bg-input border-border" /></div>
                <div><Label>Fuel Type</Label>
                  <select {...register("fuelTypeId", { required: true })} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    {fuelTypes?.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                  </select>
                </div>
                <div><Label>Capacity (Litres)</Label><Input {...register("capacity", { required: true })} type="number" placeholder="20000" className="bg-input border-border" /></div>
                <div><Label>Min Level (Litres)</Label><Input {...register("minLevel")} type="number" placeholder="2000" className="bg-input border-border" /></div>
                <div><Label>ATG Sensor ID</Label><Input {...register("atgSensorId")} placeholder="Optional sensor ID" className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={createTank.isPending}>Add Tank</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-600 text-sm">Tank Alerts ({alerts.length})</p>
            <p className="text-xs text-muted-foreground mt-1">{alerts.map(t => `${t.name} (${t.status})`).join(', ')}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(4).fill(0).map((_, i) => <Card key={i} className="h-64 animate-pulse bg-card border-border" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tanks?.map(tank => <TankCard key={tank.id} tank={tank} onUpdate={refetch} />) || (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No tanks configured for this station</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
