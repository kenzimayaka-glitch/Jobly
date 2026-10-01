"use client";
import {useEffect,useState} from "react";
export default function VideoQuotaIndicator(){
 const [q,setQ]=useState<any>(null);
 useEffect(()=>{fetch("/api/recruitment360/video/quota").then(r=>r.ok?r.json():null).then(setQ).catch(()=>undefined)},[]);
 if(!q)return null;
 return <div className="rounded-xl border p-3 text-xs"><strong>Visio</strong> · profil {q.profile} · fournisseur {q.provider} · {q.limitMinutes==null?"quota non limité":q.usedMinutes+" / "+q.limitMinutes+" min participant ce mois"}{q.warn&&!q.exhausted&&<span className="ml-2 font-bold">Attention : seuil de 80 % atteint.</span>}{q.exhausted&&<span className="ml-2 font-bold">Quota atteint : basculez vers le lien externe/Jitsi configuré.</span>}</div>;
}
