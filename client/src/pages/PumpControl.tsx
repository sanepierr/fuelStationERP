import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Fuel, Loader2, Power, PowerOff, Wrench, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: "Active",      color: "bg-green-500/20 text-green-400 border-green-500/30",  icon: <CheckCircle className="w-3 h-3" /> },
  inactive:    { label: "Inactive",    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",    icon: <PowerOff className="w-3 h-3" /> },
  maintenance: { label: "Maintenance", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Wrench className="w-3 h-3" /> },
  fault:       { label: "Fault",       color: "bg-red-500/20 text-red-400 border-red-500/30",       icon: <XCircle className="w-3 h-3" /> },
};

export default function PumpControl() {
  const { user } = useAuth();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const stationsQuery = trpc.stations.list.useQuery();
  const stations = stationsQuery.data ?? [];
  const stationId = selectedStationId ?? stations[0]?.id;

  const pumpsQuery = trpc.pumps.forStation.useQuery({ stationId: stationId! }, { enabled: !!stationId, refetchInterval: 15000 });
  const pumps = pumpsQuery.data ?? [];

  const updateStatus = trpc.pumps.updateStatus.useMutation({
    onMutate: ({ pumpId }) => setUpdatingId(pumpId),
    onSuccess: () => { pumpsQuery.refetch(); toast.success("Pump status updated"); },
    onError: (e) => toast.error(e.message),
    onSettled: () => setUpdatingId(null),
  });

  const isManager = ["super_admin", "company_owner", "company_admin", "manager", "supervisor"].includes(user?.role ?? "");

  const activeCount = pumps.filter(p => p.status === "active").length;
  const faultCount = pumps.filter(p => p.status === "fault").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pump Control</h1>
          <p className="text-muted-foreground text-sm mt-1">Enable, disable, and authorise pumps in real time</p>
        </div>
        <Select value={stationId?.toString()} onValueChange={v => setSelectedStationId(Number(v))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select station" />
          </SelectTrigger>
          <SelectContent>
            {stations.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Pumps", value: pumps.length, color: "text-foreground" },
          { label: "Active", value: activeCount, color: "text-green-400" },
          { label: "Faults", value: faultCount, color: faultCount > 0 ? "text-red-400" : "text-muted-foreground" },
          { label: "In Maintenance", value: pumps.filter(p => p.status === "maintenance").length, color: "text-yellow-400" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isManager && (
        <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          You have read-only access. Manager role or above is required to change pump status.
        </div>
      )}

      {pumpsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : pumps.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Fuel className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No pumps configured for this station.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pumps.map(pump => {
            const cfg = statusConfig[pump.status] ?? statusConfig.inactive;
            const isUpdating = updatingId === pump.id;
            return (
              <Card key={pump.id} className="relative">
                {isUpdating && (
                  <div className="absolute inset-0 bg-background/70 rounded-lg flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{pump.name}</CardTitle>
                    <Badge className={`text-xs border flex items-center gap-1 ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </Badge>
                  </div>
                  {pump.serialNumber && <p className="text-xs text-muted-foreground">S/N: {pump.serialNumber}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Nozzles</p>
                      <p className="font-semibold">{pump.nozzleCount}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs text-muted-foreground">Totalizer</p>
                      <p className="font-semibold">{pump.totalizer ? Number(pump.totalizer).toLocaleString() : "—"} L</p>
                    </div>
                  </div>
                  {isManager && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={pump.status === "active" ? "destructive" : "default"}
                        onClick={() => updateStatus.mutate({ pumpId: pump.id, status: pump.status === "active" ? "inactive" : "active" })}
                        disabled={isUpdating}
                        className="w-full"
                      >
                        {pump.status === "active" ? <><PowerOff className="w-3 h-3 mr-1" />Disable</> : <><Power className="w-3 h-3 mr-1" />Enable</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ pumpId: pump.id, status: pump.status === "maintenance" ? "inactive" : "maintenance" })}
                        disabled={isUpdating}
                        className="w-full"
                      >
                        <Wrench className="w-3 h-3 mr-1" />
                        {pump.status === "maintenance" ? "Clear" : "Maintenance"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
