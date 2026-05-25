import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function activeIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

function inactiveIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ stations }: { stations: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (!stations?.length) return;
    const coords = stations
      .filter(s => s.latitude && s.longitude)
      .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number]);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  }, [stations, map]);
  return null;
}

export default function StationMap() {
  const { data: stations } = trpc.stations.list.useQuery();
  const [selectedStation, setSelectedStation] = useState<any>(null);

  const stationsWithCoords = stations?.map(s => ({
    ...s,
    lat: parseFloat((s as any).latitude) || 0.3476,
    lng: parseFloat((s as any).longitude) || 32.5825,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Station Network Map</h1>
        <p className="text-muted-foreground text-sm">Geo-location view of all connected fuel stations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-[500px] relative z-0">
              <MapContainer
                center={[0.3476, 32.5825]}
                zoom={8}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds stations={stationsWithCoords} />
                {stationsWithCoords.map(station => (
                  <Marker
                    key={station.id}
                    position={[station.lat, station.lng]}
                    icon={station.status === "active" ? activeIcon() : inactiveIcon()}
                    eventHandlers={{ click: () => setSelectedStation(station) }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[160px]">
                        <p className="font-bold text-gray-900">{station.name}</p>
                        <p className="text-gray-500 text-xs mt-1">{station.address || "Uganda"}</p>
                        <p className="text-xs mt-1">
                          <span style={{ color: station.status === "active" ? "#22c55e" : "#ef4444" }}>
                            {station.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Code: {station.code}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-sm">Network Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Stations</span>
                <span className="font-bold text-foreground">{stations?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-bold text-emerald-600">{stations?.filter(s => s.status === "active").length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inactive</span>
                <span className="font-bold text-red-600">{stations?.filter(s => s.status !== "active").length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {stations?.map(station => (
              <Card
                key={station.id}
                className={`bg-card border-border card-hover cursor-pointer transition-all ${selectedStation?.id === station.id ? "border-primary" : ""}`}
                onClick={() => setSelectedStation(station)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${station.status === "active" ? "text-emerald-600" : "text-red-600"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{station.name}</p>
                        <p className="text-xs text-muted-foreground">{station.code}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={station.status === "active" ? "badge-active" : "badge-inactive"}>
                      {station.status === "active" ? "Active" : "Offline"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {selectedStation && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {selectedStation.name} - Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Code</p><p className="font-mono font-bold text-foreground">{selectedStation.code}</p></div>
              <div><p className="text-muted-foreground text-xs">Address</p><p className="font-medium text-foreground">{selectedStation.address || "--"}</p></div>
              <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium text-foreground">{selectedStation.phone || "--"}</p></div>
              <div><p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline" className={selectedStation.status === "active" ? "badge-active" : "badge-inactive"}>
                  {selectedStation.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
