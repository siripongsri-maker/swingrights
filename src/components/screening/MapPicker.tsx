import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TH_CENTER } from '@/lib/thaiGeo';

interface Props {
  value: { lat: number; lng: number } | null;
  center?: [number, number] | null;
  onChange: (v: { lat: number; lng: number } | null) => void;
}

/** Lightweight OpenStreetMap picker — click (or drag the pin) to drop a location. */
export function MapPicker({ value, center, onChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { attributionControl: true, zoomControl: true }).setView(
      value ? [value.lat, value.lng] : center ?? TH_CENTER,
      value || center ? 14 : 6,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 120);
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      if (marker.current) { marker.current.remove(); marker.current = null; }
      if (center) m.setView(center, 12);
      return;
    }
    const pos: L.LatLngExpression = [value.lat, value.lng];
    if (!marker.current) {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:hsl(var(--primary));border:3px solid hsl(var(--card));box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      marker.current = L.marker(pos, { icon, draggable: true }).addTo(m);
      marker.current.on('dragend', (e) => {
        const ll = (e.target as L.Marker).getLatLng();
        onChangeRef.current({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
      });
    } else {
      marker.current.setLatLng(pos);
    }
    if (m.getZoom() < 12) m.setView(pos, 15);
  }, [value, center]);

  return <div ref={el} className="h-56 w-full rounded-[1.25rem] overflow-hidden border border-border z-0" />;
}
