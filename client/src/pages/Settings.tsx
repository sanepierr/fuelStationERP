import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ChevronDown, DollarSign, Loader2, Save, Server, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  const stationsQuery = trpc.stations.list.useQuery();
  const stations = stationsQuery.data ?? [];
  const stationId = selectedStationId ?? stations[0]?.id;

  const stationQuery = trpc.stations.get.useQuery({ id: stationId! }, { enabled: !!stationId });
  const station = stationQuery.data;

  const fuelTypesQuery = trpc.fuelTypes.list.useQuery();
  const fuelTypes = fuelTypesQuery.data ?? [];
  const fuelPricesQuery = trpc.fuelPrices.forStation.useQuery({ stationId: stationId! }, { enabled: !!stationId });
  const fuelPrices = fuelPricesQuery.data ?? [];

  // Station info form
  const [info, setInfo] = useState({ name: "", address: "", city: "", phone: "", email: "", tinNumber: "", licenseNumber: "", status: "active" as "active" | "inactive" | "maintenance" });
  // CCTV form
  const [cctv, setCctv] = useState({ hikVisionHost: "", hikVisionUsername: "", hikVisionPassword: "", atgHost: "", atgPort: 10001 });
  // PTS-2 form
  const [pts2, setPts2] = useState({ pts2Host: "", pts2Port: 80, pts2Username: "", pts2Password: "", pts2SyncEnabled: false, pts2FirmwareVersion: "", pts2SerialNumber: "" });
  // Fuel prices
  const [prices, setPrices] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!station) return;
    setInfo({ name: station.name ?? "", address: (station.address as string) ?? "", city: station.city ?? "", phone: station.phone ?? "", email: station.email ?? "", tinNumber: station.tinNumber ?? "", licenseNumber: station.licenseNumber ?? "", status: station.status });
    setCctv({ hikVisionHost: (station.hikVisionHost as string) ?? "", hikVisionUsername: station.hikVisionUsername ?? "", hikVisionPassword: "", atgHost: (station.atgHost as string) ?? "", atgPort: station.atgPort ?? 10001 });
    setPts2({ pts2Host: (station as any).pts2Host ?? "", pts2Port: (station as any).pts2Port ?? 80, pts2Username: (station as any).pts2Username ?? "", pts2Password: "", pts2SyncEnabled: (station as any).pts2SyncEnabled ?? false, pts2FirmwareVersion: (station as any).pts2FirmwareVersion ?? "", pts2SerialNumber: (station as any).pts2SerialNumber ?? "" });
  }, [station]);

  useEffect(() => {
    const map: Record<number, string> = {};
    fuelPrices.forEach((fp: any) => { if (fp.isActive) map[fp.fuelTypeId] = fp.pricePerUnit; });
    setPrices(map);
  }, [fuelPrices]);

  const updateStation = trpc.stations.update.useMutation({
    onSuccess: () => { stationQuery.refetch(); toast.success("Settings saved"); },
    onError: (e) => toast.error(e.message),
  });

  const setFuelPrice = trpc.fuelPrices.set.useMutation({
    onSuccess: () => { fuelPricesQuery.refetch(); toast.success("Prices updated"); },
    onError: (e) => toast.error(e.message),
  });

  const isAdmin = ["super_admin", "company_owner", "company_admin"].includes(user?.role ?? "");
  const isManager = isAdmin || ["manager", "supervisor"].includes(user?.role ?? "");

  if (!isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Shield className="w-8 h-8 mr-3" /><p>You don't have permission to access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage station configuration, integrations, and fuel prices</p>
        </div>
        <Select value={stationId?.toString()} onValueChange={v => setSelectedStationId(Number(v))}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select station" />
          </SelectTrigger>
          <SelectContent>
            {stations.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {stationQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="info">
          <TabsList className="mb-6">
            <TabsTrigger value="info"><Building2 className="w-4 h-4 mr-2" />Station Info</TabsTrigger>
            <TabsTrigger value="pts2"><Server className="w-4 h-4 mr-2" />PTS-2 Controller</TabsTrigger>
            <TabsTrigger value="cctv"><Shield className="w-4 h-4 mr-2" />CCTV / ATG</TabsTrigger>
            <TabsTrigger value="prices"><DollarSign className="w-4 h-4 mr-2" />Fuel Prices</TabsTrigger>
          </TabsList>

          {/* Station Info */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Station Information</CardTitle>
                <CardDescription>Basic details and regulatory identifiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Station Name</Label><Input value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={info.status} onValueChange={(v: any) => setInfo(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Address</Label><Input value={info.address} onChange={e => setInfo(p => ({ ...p, address: e.target.value }))} /></div>
                  <div><Label>City</Label><Input value={info.city} onChange={e => setInfo(p => ({ ...p, city: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Phone</Label><Input value={info.phone} onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input type="email" value={info.email} onChange={e => setInfo(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>TIN Number</Label><Input value={info.tinNumber} onChange={e => setInfo(p => ({ ...p, tinNumber: e.target.value }))} placeholder="URA Tax ID" /></div>
                  <div><Label>License Number</Label><Input value={info.licenseNumber} onChange={e => setInfo(p => ({ ...p, licenseNumber: e.target.value }))} /></div>
                </div>
                <Button onClick={() => updateStation.mutate({ id: stationId!, ...info })} disabled={updateStation.isPending}>
                  {updateStation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PTS-2 Controller */}
          <TabsContent value="pts2">
            <Card>
              <CardHeader>
                <CardTitle>PTS-2 Controller Configuration</CardTitle>
                <CardDescription>Technotrade pump controller integration settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Controller Host / IP</Label><Input value={pts2.pts2Host} onChange={e => setPts2(p => ({ ...p, pts2Host: e.target.value }))} placeholder="192.168.1.100" /></div>
                  <div><Label>Port</Label><Input type="number" value={pts2.pts2Port} onChange={e => setPts2(p => ({ ...p, pts2Port: Number(e.target.value) }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Username</Label><Input value={pts2.pts2Username} onChange={e => setPts2(p => ({ ...p, pts2Username: e.target.value }))} /></div>
                  <div><Label>Password</Label><Input type="password" value={pts2.pts2Password} onChange={e => setPts2(p => ({ ...p, pts2Password: e.target.value }))} placeholder="Leave blank to keep current" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Firmware Version</Label><Input value={pts2.pts2FirmwareVersion} onChange={e => setPts2(p => ({ ...p, pts2FirmwareVersion: e.target.value }))} placeholder="e.g. 3.2.1" /></div>
                  <div><Label>Serial Number</Label><Input value={pts2.pts2SerialNumber} onChange={e => setPts2(p => ({ ...p, pts2SerialNumber: e.target.value }))} /></div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={pts2.pts2SyncEnabled} onCheckedChange={v => setPts2(p => ({ ...p, pts2SyncEnabled: v }))} id="pts2sync" />
                  <Label htmlFor="pts2sync">Enable automatic transaction sync</Label>
                  {pts2.pts2SyncEnabled && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Sync ON</Badge>}
                </div>
                {(station as any)?.pts2LastSync && (
                  <p className="text-xs text-muted-foreground">Last sync: {new Date((station as any).pts2LastSync).toLocaleString()}</p>
                )}
                <Button onClick={() => updateStation.mutate({ id: stationId!, ...pts2 })} disabled={updateStation.isPending}>
                  {updateStation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save PTS-2 Config</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CCTV / ATG */}
          <TabsContent value="cctv">
            <Card>
              <CardHeader>
                <CardTitle>CCTV & ATG Configuration</CardTitle>
                <CardDescription>Hikvision NVR credentials and ATG sensor endpoint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-foreground">Hikvision NVR</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Host / IP</Label><Input value={cctv.hikVisionHost} onChange={e => setCctv(p => ({ ...p, hikVisionHost: e.target.value }))} placeholder="192.168.1.200" /></div>
                  <div><Label>Username</Label><Input value={cctv.hikVisionUsername} onChange={e => setCctv(p => ({ ...p, hikVisionUsername: e.target.value }))} /></div>
                  <div><Label>Password</Label><Input type="password" value={cctv.hikVisionPassword} onChange={e => setCctv(p => ({ ...p, hikVisionPassword: e.target.value }))} placeholder="Leave blank to keep current" /></div>
                </div>
                <p className="text-sm font-medium text-foreground pt-2">ATG Sensor</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>ATG Host</Label><Input value={cctv.atgHost} onChange={e => setCctv(p => ({ ...p, atgHost: e.target.value }))} placeholder="192.168.1.50" /></div>
                  <div><Label>ATG Port</Label><Input type="number" value={cctv.atgPort} onChange={e => setCctv(p => ({ ...p, atgPort: Number(e.target.value) }))} /></div>
                </div>
                <Button onClick={() => updateStation.mutate({ id: stationId!, ...cctv })} disabled={updateStation.isPending}>
                  {updateStation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save CCTV / ATG Config</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fuel Prices */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <CardTitle>Fuel Prices</CardTitle>
                <CardDescription>Current price per litre (UGX) for each fuel type at this station</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fuelTypes.filter(ft => ft.isActive).map(ft => (
                  <div key={ft.id} className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ft.color ?? "#f59e0b" }} />
                    <div className="w-32">
                      <p className="text-sm font-medium">{ft.name}</p>
                      <p className="text-xs text-muted-foreground">{ft.code}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <span className="text-sm text-muted-foreground">UGX</span>
                      <Input
                        type="number"
                        value={prices[ft.id] ?? ""}
                        onChange={e => setPrices(p => ({ ...p, [ft.id]: e.target.value }))}
                        placeholder="0.00"
                        className="max-w-40"
                      />
                      <span className="text-xs text-muted-foreground">/ litre</span>
                    </div>
                  </div>
                ))}
                {isManager && (
                  <Button
                    onClick={() => {
                      Object.entries(prices).forEach(([fuelTypeId, price]) => {
                        if (price) setFuelPrice.mutate({ stationId: stationId!, fuelTypeId: Number(fuelTypeId), pricePerUnit: price });
                      });
                    }}
                    disabled={setFuelPrice.isPending}
                  >
                    {setFuelPrice.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Update Prices</>}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
