import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface MapMarker {
  id: string;
  name: string;
  sub?: string;
  lat: number;
  lng: number;
  kind: 'partner' | 'case';
}

declare global {
  interface Window { __swingMapInit?: () => void; google?: any }
}

let loaderPromise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] as string | undefined;
    if (!key) { reject(new Error('no browser key')); return; }
    const channel = (import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] as string | undefined) ?? '';
    window.__swingMapInit = () => resolve();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__swingMapInit${channel ? `&channel=${channel}` : ''}`;
    s.async = true;
    s.onerror = () => { loaderPromise = null; reject(new Error('maps load failed')); };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/** Google Map with partner pins + optional case-area pin. Coordinates come from local data only. */
export function PartnerMap({ markers, emptyHint }: { markers: MapMarker[]; emptyHint: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    loadMaps()
      .then(() => {
        if (!alive || !ref.current) return;
        mapRef.current = new window.google.maps.Map(ref.current, {
          center: { lat: 13.5, lng: 101.0 },
          zoom: 5.4,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new window.google.maps.InfoWindow();
        setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();
    for (const mk of markers) {
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: mk.lat, lng: mk.lng },
        title: mk.name,
        icon: mk.kind === 'case'
          ? { path: window.google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#CC0099', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2.5 }
          : { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#2A2A2E', fillOpacity: 0.9, strokeColor: '#ffffff', strokeWeight: 2 },
        zIndex: mk.kind === 'case' ? 2 : 1,
      });
      marker.addListener('click', () => {
        infoRef.current?.setContent(
          `<div style="max-width:240px;font-family:inherit"><strong style="font-size:13px">${mk.name}</strong>${mk.sub ? `<div style="font-size:12px;color:#555;margin-top:2px">${mk.sub}</div>` : ''}</div>`,
        );
        infoRef.current?.open(map, marker);
      });
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
    }
    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(10);
    } else if (markers.length > 1) {
      map.fitBounds(bounds, 60);
    }
  }, [markers, status]);

  if (status === 'error') return null;
  return (
    <div className="relative rounded-xl overflow-hidden border border-border shadow-card">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/40">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
      <div ref={ref} className="w-full h-[320px] sm:h-[420px] bg-muted" />
      {markers.length === 0 && status === 'ready' && (
        <p className="absolute bottom-2 inset-x-2 text-center text-[11px] bg-card/90 rounded-md py-1 text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
}
