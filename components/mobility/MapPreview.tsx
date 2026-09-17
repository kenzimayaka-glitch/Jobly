"use client";
import dynamic from "next/dynamic";
const LeafletMap=dynamic(()=>import("./LeafletMap"),{ssr:false,loading:()=> <div className="grid h-52 place-items-center rounded-3xl border bg-slate-50 text-xs font-bold text-slate-500">Chargement GPS…</div>});
export default function MapPreview({from,to}:{from?:{lat:number,lng:number,label:string},to?:{lat:number,lng:number,label:string}}){if(!from||!to)return <div className="grid h-52 place-items-center rounded-3xl border bg-slate-50 text-xs font-bold text-slate-500">Carte GPS</div>;return <LeafletMap from={from} to={to}/>}
