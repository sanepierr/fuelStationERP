import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Gauge, Wifi, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const stationId = parseInt(id || '1');
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const { data: station, isLoading } = trpc.stations.get.useQuery({ id: stationId });
  const { data: tanks } = trpc.tanks.forStation.useQuery({ stationId });
  const { data: pumps } = trpc.pumps.forStation.useQuery({ stationId });
  const { data: prices, refetch: refetchPrices } = trpc.fuelPrices.forStation.useQuery({ stationId });
  const updatePrice = trpc.fuelPrices.set.useMutation({ onSuccess: () => { toast.success('Price updated on price board'); setEditingPriceId(null); refetchPrices(); } });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!station) return <div className="text-center py-16 text-muted-foreground">Station not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/stations')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{station.name}</h1>
          <p className="text-muted-foreground text-sm">{station.code} · {station.address}</p>
        </div>
        <Badge variant="outline" className={station.status === 'active' ? 'badge-active' : 'badge-inactive'}>{station.status}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tanks">Tanks</TabsTrigger>
          <TabsTrigger value="pumps">Pumps</TabsTrigger>
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="cameras">Cameras</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm">Station Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {([['Address', station.address], ['City', station.city], ['Phone', station.phone], ['Email', station.email], ['TIN', station.tinNumber], ['License', station.licenseNumber]] as [string, string | null | undefined][]).map(([k, v]) => v ? (
                  <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="text-foreground font-medium">{v}</span></div>
                ) : null)}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm">Integrations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600" /><span className="text-sm">Hikvision CCTV</span></div>
                  <Badge variant="outline" className={station.hikVisionHost ? 'badge-active' : 'badge-inactive'}>{station.hikVisionHost ? 'Connected' : 'Not Set'}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-emerald-600" /><span className="text-sm">ATG System</span></div>
                  <Badge variant="outline" className={station.atgHost ? 'badge-active' : 'badge-inactive'}>{station.atgHost ? station.atgHost : 'Not Set'}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2"><Wifi className="w-4 h-4 text-primary" /><span className="text-sm">Portal Status</span></div>
                  <Badge variant="outline" className="badge-active">Online</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tanks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks?.map(tank => {
              const pct = Math.min(100, (parseFloat(tank.currentLevel) / parseFloat(tank.capacity)) * 100);
              return (
                <Card key={tank.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">{tank.name}</h3>
                      <Badge variant="outline" className={tank.status === 'normal' ? 'badge-active' : tank.status === 'low' ? 'badge-warning' : 'badge-danger'}>{tank.status}</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 mb-2">
                      <div className={`h-3 rounded-full transition-all ${pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{parseFloat(tank.currentLevel).toLocaleString()}L</span>
                      <span>{Math.round(pct)}%</span>
                      <span>{parseFloat(tank.capacity).toLocaleString()}L</span>
                    </div>
                    {tank.atgSensorId && <p className="text-xs text-emerald-600 mt-2">ATG: {tank.atgSensorId}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pumps">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pumps?.map(pump => (
              <Card key={pump.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{pump.name}</h3>
                    <Badge variant="outline" className={pump.status === 'active' ? 'badge-active' : pump.status === 'fault' ? 'badge-danger' : 'badge-warning'}>{pump.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">S/N: {pump.serialNumber || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{pump.nozzleCount} nozzle{pump.nozzleCount > 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prices">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Edit2 className="w-4 h-4 text-primary" />Remote Price Board Management</CardTitle></CardHeader>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-4">Update fuel prices remotely. Changes take effect immediately on the station price board.</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground">Fuel Type ID</th><th className="text-right py-2 text-muted-foreground">Price/Litre (UGX)</th><th className="text-right py-2 text-muted-foreground">Currency</th><th className="text-right py-2 text-muted-foreground">Updated</th><th className="text-center py-2 text-muted-foreground">Action</th></tr></thead>
                <tbody>
                  {prices?.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 font-medium">Fuel #{p.fuelTypeId}</td>
                      <td className="py-2 text-right">
                        {editingPriceId === p.id ? (
                          <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-32 h-7 text-xs bg-input border-border ml-auto" type="number" step="0.01" />
                        ) : (
                          <span className="text-primary font-bold">{parseFloat(p.pricePerUnit).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{p.currency}</td>
                      <td className="py-2 text-right text-muted-foreground text-xs">{new Date(p.effectiveFrom).toLocaleDateString()}</td>
                      <td className="py-2 text-center">
                        {editingPriceId === p.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" className="h-6 px-2 text-xs" onClick={() => updatePrice.mutate({ stationId, fuelTypeId: p.fuelTypeId, pricePerUnit: editPrice, currency: p.currency })}><Save className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingPriceId(null)}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditingPriceId(p.id); setEditPrice(p.pricePerUnit); }}><Edit2 className="w-3 h-3" /></Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cameras">
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600" />Hikvision CCTV Integration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs">Host / IP</p><p className="font-mono font-medium text-foreground">{station.hikVisionHost || 'Not configured'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Username</p><p className="font-mono font-medium text-foreground">{station.hikVisionUsername || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={station.hikVisionHost ? 'badge-active' : 'badge-inactive'}>{station.hikVisionHost ? 'Configured' : 'Not Set'}</Badge></div>
                  <div><p className="text-muted-foreground text-xs">Protocol</p><p className="text-foreground">RTSP / HTTP API</p></div>
                </div>
                {station.hikVisionHost ? (
                  <div className="space-y-3">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium mb-1">Live Camera Feeds</p>
                      <p className="text-xs text-muted-foreground">Camera streams are accessible via the Hikvision NVR web interface. Ensure your network has direct access to the NVR IP.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[1,2,3,4].map(ch => (
                        <div key={ch} className="aspect-video bg-secondary/50 border border-border rounded-lg flex flex-col items-center justify-center gap-2">
                          <Camera className="w-6 h-6 text-muted-foreground opacity-40" />
                          <p className="text-xs text-muted-foreground">Channel {ch}</p>
                          <Button size="sm" variant="outline" className="h-6 text-xs bg-transparent" onClick={() => window.open(`http://${station.hikVisionHost}/ISAPI/Streaming/channels/${ch}01/httpPreview`, '_blank')}>View Stream</Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" onClick={() => window.open(`http://${station.hikVisionHost}`, '_blank')} className="gap-2 bg-transparent">
                      <Camera className="w-4 h-4" />Open Hikvision NVR Portal
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground text-sm">Configure the Hikvision host in station settings to enable camera integration.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
