import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Plus, Search, Star, CreditCard, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function Loyalty() {
  const [search, setSearch] = useState('');
  const [stationId, setStationId] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: customers, isLoading, refetch } = trpc.loyalty.customers.useQuery({ stationId: activeStationId, search: search || undefined });
  const register_ = trpc.loyalty.register.useMutation({ onSuccess: () => { toast.success("Customer registered!"); setAddOpen(false); refetch(); } });
  const { register, handleSubmit } = useForm();

  const totalPoints = customers?.reduce((sum, c) => sum + (c.totalPoints || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loyalty Program</h1>
          <p className="text-muted-foreground text-sm">NFC/RFID-based customer rewards management</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Register Customer</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Register Loyalty Customer</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => register_.mutate({ name: d.name, phone: d.phone, email: d.email || undefined, nfcCardId: d.nfcCardId || undefined, rfidCardId: d.rfidCardId || undefined, stationId: activeStationId }))} className="space-y-4">
                <div><Label>Full Name *</Label><Input {...register("name", { required: true })} placeholder="Customer name" className="bg-input border-border" /></div>
                <div><Label>Phone *</Label><Input {...register("phone", { required: true })} placeholder="+256..." className="bg-input border-border" /></div>
                <div><Label>Email</Label><Input {...register("email")} type="email" placeholder="Optional" className="bg-input border-border" /></div>
                <div><Label className="flex items-center gap-2"><CreditCard className="w-4 h-4" />NFC Card ID</Label><Input {...register("nfcCardId")} placeholder="Scan NFC card or enter ID" className="bg-input border-border" /></div>
                <div><Label className="flex items-center gap-2"><Smartphone className="w-4 h-4" />RFID Card ID</Label><Input {...register("rfidCardId")} placeholder="Scan RFID tag or enter ID" className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={register_.isPending}>Register Customer</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{customers?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total Members</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Points Outstanding</p>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{customers?.filter(c => c.nfcCardId || c.rfidCardId).length || 0}</p>
          <p className="text-xs text-muted-foreground">NFC/RFID Cards Issued</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9 bg-input border-border" />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Customer</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Card #</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">NFC/RFID</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Points</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Total Spend</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : customers?.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{c.customerNumber}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {c.nfcCardId && <Badge variant="outline" className="badge-info text-xs">NFC</Badge>}
                      {c.rfidCardId && <Badge variant="outline" className="badge-warning text-xs">RFID</Badge>}
                      {!c.nfcCardId && !c.rfidCardId && <span className="text-muted-foreground text-xs">None</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="font-bold text-amber-400">{(c.totalPoints || 0).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">UGX {parseFloat(c.totalFuelPurchased || '0').toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={c.isActive ? 'badge-active' : 'badge-inactive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
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
