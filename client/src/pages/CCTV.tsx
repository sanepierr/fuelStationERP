import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Camera, CheckCircle, Film, Plus, RefreshCw, Star, Trash2, Video, WifiOff, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  online: "bg-green-500/20 text-green-600 border-green-500/30",
  offline: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  fault: "bg-red-500/20 text-red-600 border-red-500/30",
};

const statusIcon: Record<string, React.ReactNode> = {
  online: <CheckCircle className="w-3 h-3" />,
  offline: <WifiOff className="w-3 h-3" />,
  fault: <XCircle className="w-3 h-3" />,
};

export default function CCTV() {
  const { user } = useAuth();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCamera, setNewCamera] = useState({ name: "", channelNumber: 1, location: "", streamUrl: "" });

  const stationsQuery = trpc.stations.list.useQuery();
  const stations = stationsQuery.data ?? [];
  const stationId = selectedStationId ?? stations[0]?.id;

  const camerasQuery = trpc.cameras.list.useQuery({ stationId: stationId! }, { enabled: !!stationId });
  const eventsQuery = trpc.cameraEvents.list.useQuery(
    { stationId: stationId!, cameraId: selectedCameraId ?? undefined, limit: 30 },
    { enabled: !!stationId }
  );
  const recordingsQuery = trpc.recordings.list.useQuery(
    { stationId: stationId!, cameraId: selectedCameraId ?? undefined, limit: 30 },
    { enabled: !!stationId }
  );

  const createCamera = trpc.cameras.create.useMutation({
    onSuccess: () => { camerasQuery.refetch(); setAddOpen(false); setNewCamera({ name: "", channelNumber: 1, location: "", streamUrl: "" }); toast.success("Camera added"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCamera = trpc.cameras.delete.useMutation({
    onSuccess: () => { camerasQuery.refetch(); toast.success("Camera removed"); },
    onError: (e) => toast.error(e.message),
  });
  const resolveEvent = trpc.cameraEvents.resolve.useMutation({
    onSuccess: () => eventsQuery.refetch(),
  });
  const starRecording = trpc.recordings.star.useMutation({
    onSuccess: () => recordingsQuery.refetch(),
  });
  const deleteRecording = trpc.recordings.delete.useMutation({
    onSuccess: () => { recordingsQuery.refetch(); toast.success("Recording deleted"); },
  });

  const cameras = camerasQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const recordings = recordingsQuery.data ?? [];

  const isAdmin = ["super_admin", "company_owner", "company_admin"].includes(user?.role ?? "");
  const isManager = isAdmin || ["manager", "supervisor"].includes(user?.role ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CCTV Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor cameras, events, and recordings</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={stationId?.toString()} onValueChange={v => { setSelectedStationId(Number(v)); setSelectedCameraId(null); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select station" />
            </SelectTrigger>
            <SelectContent>
              {stations.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {isManager && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Camera</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Camera</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Name</Label><Input value={newCamera.name} onChange={e => setNewCamera(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Forecourt Camera 1" /></div>
                  <div><Label>Channel Number</Label><Input type="number" value={newCamera.channelNumber} onChange={e => setNewCamera(p => ({ ...p, channelNumber: Number(e.target.value) }))} /></div>
                  <div><Label>Location</Label><Input value={newCamera.location} onChange={e => setNewCamera(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Pump 1 area" /></div>
                  <div><Label>Stream URL (optional)</Label><Input value={newCamera.streamUrl} onChange={e => setNewCamera(p => ({ ...p, streamUrl: e.target.value }))} placeholder="rtsp://..." /></div>
                  <Button className="w-full" onClick={() => createCamera.mutate({ stationId: stationId!, ...newCamera })} disabled={!newCamera.name || createCamera.isPending}>
                    {createCamera.isPending ? "Adding..." : "Add Camera"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="cameras">
        <TabsList>
          <TabsTrigger value="cameras"><Camera className="w-4 h-4 mr-2" />Cameras ({cameras.length})</TabsTrigger>
          <TabsTrigger value="events"><AlertTriangle className="w-4 h-4 mr-2" />Events ({events.filter(e => !e.isResolved).length})</TabsTrigger>
          <TabsTrigger value="recordings"><Film className="w-4 h-4 mr-2" />Recordings ({recordings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="cameras" className="mt-4">
          {cameras.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><Video className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No cameras configured for this station.</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.map(cam => (
                <Card key={cam.id} className={`cursor-pointer transition-all ${selectedCameraId === cam.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedCameraId(selectedCameraId === cam.id ? null : cam.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{cam.name}</CardTitle>
                      <Badge className={`text-xs border ${statusColor[cam.status]}`}>
                        <span className="mr-1">{statusIcon[cam.status]}</span>
                        {cam.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-3">
                      {cam.snapshotUrl ? (
                        <img src={cam.snapshotUrl} alt={cam.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Camera className="w-10 h-10 text-muted-foreground opacity-40" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Ch. {cam.channelNumber}{cam.location ? ` · ${cam.location}` : ""}</span>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); deleteCamera.mutate({ id: cam.id }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {events.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground"><AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No events recorded.</p></div>
              ) : (
                <div className="divide-y divide-border">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`text-xs border ${ev.isResolved ? "bg-green-500/10 text-green-600 border-green-500/20" : ev.eventType === "motion" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                          {ev.eventType}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{ev.description ?? ev.eventType}</p>
                          <p className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {!ev.isResolved && isManager && (
                        <Button variant="ghost" size="sm" onClick={() => resolveEvent.mutate({ id: ev.id })}>
                          <CheckCircle className="w-4 h-4 mr-1" />Resolve
                        </Button>
                      )}
                      {ev.isResolved && <Badge className="text-xs bg-muted text-muted-foreground">Resolved</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recordings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground"><Film className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No recordings found.</p></div>
              ) : (
                <div className="divide-y divide-border">
                  {recordings.map(rec => (
                    <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Video className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{new Date(rec.startTime).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {rec.durationSeconds ? `${Math.floor(rec.durationSeconds / 60)}m ${rec.durationSeconds % 60}s` : "Duration unknown"}
                            {rec.fileSize ? ` · ${(rec.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${rec.isStarred ? "text-yellow-600" : "text-muted-foreground"}`} onClick={() => starRecording.mutate({ id: rec.id, isStarred: !rec.isStarred })}>
                          <Star className="w-4 h-4" fill={rec.isStarred ? "currentColor" : "none"} />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRecording.mutate({ id: rec.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
