import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserCheck, Plus, Fingerprint } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export default function Attendants() {
  const [stationId, setStationId] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: attendants, isLoading, refetch } = trpc.attendants.forStation.useQuery({ stationId: activeStationId });
  const createAttendant = trpc.attendants.register.useMutation({ onSuccess: () => { toast.success("Attendant registered successfully"); setAddOpen(false); refetch(); } });
  const toggleActive = trpc.attendants.toggleActive.useMutation({ onSuccess: () => { toast.success("Attendant status updated"); refetch(); } });
  const { register, handleSubmit } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pump Attendants</h1>
          <p className="text-muted-foreground text-sm">Register and manage pump attendants - only registered attendants can operate pumps</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Register Attendant</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader><DialogTitle>Register Pump Attendant</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createAttendant.mutate({ stationId: activeStationId, name: d.name, phone: d.phone || undefined, employeeId: d.employeeId, nfcCardId: d.nfcTagId || undefined }))} className="space-y-4">
                <div><Label>Full Name *</Label><Input {...register("name", { required: true })} placeholder="John Doe" className="bg-input border-border" /></div>
                <div><Label>Employee ID *</Label><Input {...register("employeeId", { required: true })} placeholder="EMP-001" className="bg-input border-border" /></div>
                <div><Label>Phone Number</Label><Input {...register("phone")} placeholder="+256..." className="bg-input border-border" /></div>
                <div><Label>NFC/RFID Tag ID</Label><Input {...register("nfcTagId")} placeholder="Tag UID (optional)" className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={createAttendant.isPending}>Register Attendant</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{attendants?.length || 0}</p><p className="text-xs text-muted-foreground mt-1">Total Registered</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{attendants?.filter((a: any) => a.isActive).length || 0}</p><p className="text-xs text-muted-foreground mt-1">Active</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{attendants?.filter((a: any) => !a.isActive).length || 0}</p><p className="text-xs text-muted-foreground mt-1">Inactive</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{attendants?.filter((a: any) => a.nfcTagId).length || 0}</p><p className="text-xs text-muted-foreground mt-1">NFC Enabled</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Card key={i} className="h-32 animate-pulse bg-card border-border" />)
        ) : attendants?.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No attendants registered</p>
          </div>
        ) : attendants?.map((att: any) => (
          <Card key={att.id} className="bg-card border-border card-hover">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {att.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{att.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{att.employeeId}</p>
                  </div>
                </div>
                <Badge variant="outline" className={att.isActive ? 'badge-active' : 'badge-inactive'}>{att.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {att.phone && <p>📞 {att.phone}</p>}
                {att.nfcTagId && <p className="flex items-center gap-1"><Fingerprint className="w-3 h-3 text-blue-600" /><span className="font-mono text-blue-600">{att.nfcTagId}</span></p>}
                <p>Registered: {new Date(att.createdAt).toLocaleDateString()}</p>
              </div>
              <Button size="sm" variant="outline" className={`w-full mt-3 h-7 text-xs ${att.isActive ? 'text-destructive border-destructive/30' : 'text-emerald-600 border-emerald-400/30'}`} onClick={() => toggleActive.mutate({ id: att.id, isActive: !att.isActive })}>
                {att.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
