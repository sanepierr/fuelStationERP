import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Fuel, Activity } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { MapView } from "@/components/Map";

export default function StationMap() {
  const { data: stations } = trpc.stations.list.useQuery();
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  const handleMapReady = (map: google.maps.Map) => {
    if (!stations?.length) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    stations.forEach(station => {
      const lat = parseFloat((station as any).latitude || '0.3476') + (Math.random() - 0.5) * 0.5;
      const lng = parseFloat((station as any).longitude || '32.5825') + (Math.random() - 0.5) * 0.5;
      const pos = { lat, lng };

      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: station.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: station.status === 'active' ? '#10b981' : '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="color:#111;padding:8px;min-width:180px">
          <strong style="font-size:14px">${station.name}</strong>
          <p style="margin:4px 0;font-size:12px;color:#666">${station.address || 'Uganda'}</p>
          <p style="margin:4px 0;font-size:12px"><span style="color:${station.status === 'active' ? '#10b981' : '#ef4444'}">${station.status === 'active' ? '● Active' : '● Inactive'}</span></p>
          <p style="margin:4px 0;font-size:12px">Code: ${station.code}</p>
        </div>`,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setSelectedStation(station);
      });

      markersRef.current.push(marker);
      bounds.extend(pos);
    });

    if (stations.length > 0) {
      map.fitBounds(bounds);
      if (stations.length === 1) map.setZoom(13);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Station Network Map</h1>
        <p className="text-muted-foreground text-sm">Geo-location view of all connected fuel stations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-[500px]">
              <MapView
                onMapReady={handleMapReady}
                initialCenter={{ lat: 0.3476, lng: 32.5825 }}
                initialZoom={8}
                className="w-full h-full"
              />
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
                <span className="font-bold text-emerald-400">{stations?.filter(s => s.status === 'active').length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inactive</span>
                <span className="font-bold text-red-400">{stations?.filter(s => s.status !== 'active').length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {stations?.map(station => (
              <Card key={station.id} className={`bg-card border-border card-hover cursor-pointer transition-all ${selectedStation?.id === station.id ? 'border-primary' : ''}`} onClick={() => setSelectedStation(station)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${station.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{station.name}</p>
                        <p className="text-xs text-muted-foreground">{station.code}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={station.status === 'active' ? 'badge-active' : 'badge-inactive'}>{station.status === 'active' ? 'Active' : 'Offline'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {selectedStation && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />{selectedStation.name} — Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Code</p><p className="font-mono font-bold text-foreground">{selectedStation.code}</p></div>
              <div><p className="text-muted-foreground text-xs">Address</p><p className="font-medium text-foreground">{selectedStation.address || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium text-foreground">{selectedStation.phone || '—'}</p></div>
              <div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={selectedStation.status === 'active' ? 'badge-active' : 'badge-inactive'}>{selectedStation.status === 'active' ? 'Active' : 'Inactive'}</Badge></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
