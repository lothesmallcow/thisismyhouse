"use client";
// The map of "Dove": the main city with its radius, one city per other country, click to choose.
// CARTO's light basemap (OpenStreetMap data), attribution shown as their terms ask.
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

export interface MapPlace {
  name: string;
  lat: number;
  lng: number;
  country: string;
  km: number;
  main?: boolean;
}

function Fit({ places }: { places: MapPlace[] }) {
  const map = useMap();
  const key = places.map((p) => `${p.lat},${p.lng},${p.km}`).join("|");
  useEffect(() => {
    if (places.length === 0) return;
    if (places.length === 1) {
      const p = places[0];
      // Zoom so that the radius fits, with a little margin.
      const zoom = p.km > 60 ? 8 : p.km > 25 ? 9 : p.km > 10 ? 10 : 11;
      map.flyTo([p.lat, p.lng], zoom, { duration: 0.8 });
    } else {
      map.flyToBounds(places.map((p) => [p.lat, p.lng] as [number, number]), { padding: [50, 50], duration: 0.8, maxZoom: 8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function Clicks({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function PlaceMap({ places, onPick }: { places: MapPlace[]; onPick: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={[45.46, 9.19]} zoom={6} scrollWheelZoom={false} className="h-[340px] w-full rounded-[var(--radius-card)] border border-line" style={{ background: "#e8eef0" }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {places.map((p) => (
        <Circle key={`c-${p.name}-${p.country}`} center={[p.lat, p.lng]} radius={p.km * 1000} pathOptions={{ color: p.main ? "#1f6f5c" : "#5b7f95", weight: 1.5, fillOpacity: 0.12 }} />
      ))}
      {places.map((p) => (
        <CircleMarker key={`m-${p.name}-${p.country}`} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: p.main ? "#1f6f5c" : "#5b7f95", fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -6]} permanent>
            {p.name} · {p.km} km
          </Tooltip>
        </CircleMarker>
      ))}
      <Fit places={places} />
      <Clicks onPick={onPick} />
    </MapContainer>
  );
}
