"use client";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

function useIcons(){useEffect(()=>{delete (L.Icon.Default.prototype as any)._getIconUrl;L.Icon.Default.mergeOptions({iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"})},[])}
export default function LeafletMap({from,to}:{from:{lat:number,lng:number,label:string},to:{lat:number,lng:number,label:string}}){useIcons();const center=[(from.lat+to.lat)/2,(from.lng+to.lng)/2] as [number,number];return <div className="h-56 overflow-hidden rounded-3xl"><MapContainer center={center} zoom={7} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[from.lat,from.lng]}><Popup>{from.label}</Popup></Marker><Marker position={[to.lat,to.lng]}><Popup>{to.label}</Popup></Marker><Polyline positions={[[from.lat,from.lng],[to.lat,to.lng]]}/></MapContainer></div>}
