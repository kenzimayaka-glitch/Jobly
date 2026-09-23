"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { jobPublicUrl, JOBLY_PUBLIC_HOST } from "../lib/site";

type Props = { job: { id: string; title: string; companyName?: string | null } };

export default function ViralPoster({ job }: Props) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function generate(){
    setBusy(true); setMessage("");
    try {
      const canvas=document.createElement("canvas");
      canvas.width=1080; canvas.height=1080;
      const ctx=canvas.getContext("2d");
      if(!ctx) throw new Error("Canvas indisponible.");
      ctx.fillStyle="#FFFFFF"; ctx.fillRect(0,0,1080,1080);
      ctx.fillStyle="#0A1931"; ctx.font="900 42px Arial"; ctx.fillText("JOBLY",70,90);
      ctx.fillStyle="#FFE135"; ctx.roundRect(70,135,940,14,7); ctx.fill();
      ctx.fillStyle="#0A1931"; ctx.font="900 66px Arial";
      const words=job.title.split(" "); let line=""; let y=250;
      for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>900){ctx.fillText(line,70,y);y+=82;line=word;}else line=test;}
      if(line)ctx.fillText(line,70,y);
      ctx.fillStyle="#0057B8"; ctx.font="700 34px Arial"; ctx.fillText(job.companyName||"Entreprise",70,y+80);
      const url=jobPublicUrl(job.id, "recruiter");
      const qr=await QRCode.toDataURL(url,{width:360,margin:2});
      const img=new Image(); img.src=qr; await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error("QR indisponible."));});
      ctx.drawImage(img,610,590,360,360);
      ctx.fillStyle="#0A1931"; ctx.font="700 30px Arial"; ctx.fillText("Postule directement sur",70,700); ctx.fillText(JOBLY_PUBLIC_HOST,70,745);
      ctx.fillStyle="#0057B8"; ctx.font="700 25px Arial"; ctx.fillText(url,70,800);
      const link=document.createElement("a"); link.download=`jobly-${job.id}-affiche.png`; link.href=canvas.toDataURL("image/png"); link.click();
      setMessage("Affiche virale générée et prête.");
    }catch(e){setMessage(e instanceof Error?e.message:"Impossible de générer l'affiche.");}
    finally{setBusy(false);}
  }
  return <button type="button" onClick={generate} disabled={busy} className="w-full rounded-full bg-[#FFE135] px-5 py-3 text-sm font-black text-navy disabled:opacity-50">{busy?"Génération…":"Générer affiche virale"}{message&&<span className="ml-2 text-[10px]">{message}</span>}</button>;
}
