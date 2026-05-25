import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Phone, Plus, Search, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function Stations() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: stations, isLoading, refetch } = trpc.stations.list.useQuery();
  const createStation = trpc.stations.create.useMutation({ onSuccess: () => { toast.success("Station created"); setOpen(false); refetch(); } });
  const { register, handleSubmit, reset } = useForm();

  const filtered = stations?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())) || [];

  const onSubmit = (data: any) => createStation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stations</h1>
          <p className="text-muted-foreground text-sm">Manage all connected fuel stations</p>
        </div>
        {['super_admin', 'company_owner', 'company_admin'].includes(user?.role || '') && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Add Station</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Add New Station</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Station Name *</Label><Input {...register("name", { required: true })} placeholder="e.g. Kampala Central" className="bg-input border-border" /></div>
                  <div><Label>Station Code *</Label><Input {...register("code", { required: true })} placeholder="e.g. KLA-001" className="bg-input border-border" /></div>
                  <div className="col-span-2"><Label>Address</Label><Input {...register("address")} placeholder="Street address" className="bg-input border-border" /></div>
                  <div><Label>City</Label><Input {...register("city")} placeholder="Kampala" className="bg-input border-border" /></div>
                  <div><Label>Phone</Label><Input {...register("phone")} placeholder="+256..." className="bg-input border-border" /></div>
                  <div><Label>Latitude</Label><Input {...register("latitude")} placeholder="0.3476" className="bg-input border-border" /></div>
                  <div><Label>Longitude</Label><Input {...register("longitude")} placeholder="32.5825" className="bg-input border-border" /></div>
                  <div><Label>TIN Number</Label><Input {...register("tinNumber")} placeholder="Uganda TIN" className="bg-input border-border" /></div>
                  <div><Label>License Number</Label><Input {...register("licenseNumber")} placeholder="License #" className="bg-input border-border" /></div>
                  <div><Label>Hikvision Host</Label><Input {...register("hikVisionHost")} placeholder="192.168.1.100" className="bg-input border-border" /></div>
                  <div><Label>ATG Host</Label><Input {...register("atgHost")} placeholder="192.168.1.101" className="bg-input border-border" /></div>
                </div>
                <Button type="submit" className="w-full" disabled={createStation.isPending}>
                  {createStation.isPending ? "Creating..." : "Create Station"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stations..." className="pl-9 bg-input border-border" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-card border-border" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(station => (
            <Card key={station.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => navigate(`/stations/${station.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {station.hikVisionHost ? <span title="Hikvision Connected"><Wifi className="w-3.5 h-3.5 text-emerald-400" /></span> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Badge variant="outline" className={station.status === 'active' ? 'badge-active' : station.status === 'maintenance' ? 'badge-warning' : 'badge-inactive'}>
                      {station.status}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground">{station.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{station.code}</p>
                <div className="mt-3 space-y-1">
                  {station.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{station.address}, {station.city}
                    </div>
                  )}
                  {station.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />{station.phone}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>TIN: {station.tinNumber || 'N/A'}</span>
                  {station.atgHost && <span className="text-emerald-400">ATG Connected</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No stations found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
