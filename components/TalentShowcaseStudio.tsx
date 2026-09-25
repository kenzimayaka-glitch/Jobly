"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Play, Save, Sparkles, Upload, Video } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Plan = "FREE" | "PRO" | "PREMIUM";
type Props = {
  plan: Plan;
  pitchUrl: string | null;
  pitchDuration: number | null;
  busy: boolean;
  message: string | null;
  recording: boolean;
  setRecording: (v: boolean) => void;
  recordSeconds: number;
  setRecordSeconds: (v: number) => void;
  onUpload: (f: File) => Promise<void>;
  onDelete: () => Promise<void>;
  startRecording: () => Promise<void>;
  router: any;
};

const LIMITS = {
  PRO: { pitch: 20, images: 6, ad: 12 },
  PREMIUM: { pitch: 10, images: 3, ad: 8 },
} as const;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Image non supportée.")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", .76));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible.")); };
    img.src = url;
  });
}

async function generateAdBlob(pitchUrl: string, imageUrls: string[], name: string, headline: string, seconds: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 720; canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas vidéo indisponible.");
  const video = document.createElement("video");
  video.src = pitchUrl; video.muted = true; video.playsInline = true; video.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("Pitch vidéo illisible.")); video.load(); });
  await video.play().catch(() => {});
  const stream = canvas.captureStream(30);
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  try {
    const source = audioCtx.createMediaElementSource(video);
    source.connect(dest); source.connect(audioCtx.destination);
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  } catch {}
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const images = await Promise.all(imageUrls.slice(0, 6).map(src => new Promise<HTMLImageElement>((resolve) => {
    const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(i); i.src = src;
  })));
  const start = performance.now();
  const draw = () => {
    const elapsed = (performance.now() - start) / 1000;
    ctx.fillStyle = "#17212B"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (video.readyState >= 2) {
      const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const w = video.videoWidth * scale, h = video.videoHeight * scale;
      ctx.drawImage(video, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
    }
    ctx.fillStyle = "rgba(23,33,43,.38)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const idx = images.length ? Math.floor(elapsed / Math.max(.8, seconds / Math.max(1, images.length))) % images.length : -1;
    if (idx >= 0 && images[idx].complete && images[idx].naturalWidth) {
      ctx.fillStyle = "rgba(23,33,43,.55)"; ctx.fillRect(0, 0, canvas.width, 300);
      ctx.drawImage(images[idx], 42, 42, 150, 150);
    }
    ctx.fillStyle = "#FFE135"; ctx.font = "900 48px sans-serif"; ctx.fillText(name.slice(0, 24), 42, 260);
    ctx.fillStyle = "#FFFEFB"; ctx.font = "700 30px sans-serif";
    const words = headline.slice(0, 80).split(" "); let line = ""; let y = 330;
    for (const word of words) { const test = line ? line + " " + word : word; if (ctx.measureText(test).width > 630) { ctx.fillText(line, 42, y); y += 38; line = word; } else line = test; }
    if (line) ctx.fillText(line, 42, y);
    ctx.fillStyle = "#FFE135"; ctx.font = "800 22px sans-serif"; ctx.fillText("JOBLY · TOP TALENT", 42, 1225);
    if (elapsed < seconds) requestAnimationFrame(draw);
  };
  recorder.start(); draw();
  await new Promise<void>(resolve => setTimeout(resolve, seconds * 1000));
  if (recorder.state !== "inactive") recorder.stop();
  const blob = await new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = () => reject(new Error("Génération vidéo impossible."));
  });
  video.pause(); stream.getTracks().forEach(t => t.stop()); await audioCtx.close().catch(() => {});
  return blob;
}

export default function TalentShowcaseStudio(props: Props) {
  const { plan, pitchUrl, pitchDuration, busy, message, recording, setRecording, recordSeconds, setRecordSeconds, onUpload, onDelete, startRecording, router } = props;
  const limits = plan === "FREE" ? null : LIMITS[plan];
  const [tab, setTab] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState({ value: "", link: "" });
  const [summary, setSummary] = useState("");
  const [publicProfile, setPublicProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generation, setGeneration] = useState<string | null>(null);
  const [adUrl, setAdUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const session = (await getSupabaseClient().auth.getSession()).data.session;
      if (!session) return;
      const r = await fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!r.ok) return;
      const b = await r.json();
      const u = b.user || {};
      setImages(Array.isArray(u.actionImages) ? u.actionImages : []);
      setPortfolio(u.portfolioBusiness || { value: "", link: "" });
      setSummary(u.executiveSummary || "");
      setPublicProfile(b.profile?.publicDiscoverable !== false);
      setAdUrl(u.advertisingVideoUrl || null);
    })();
  }, []);

  const tabs = ["Vidéo Pitch", "Actions", "Portfolio Business", "Executive Summary"];
  async function save() {
    const session = (await getSupabaseClient().auth.getSession()).data.session;
    if (!session) return;
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ section: "showcase", actionImages: images, portfolioBusiness: portfolio, executiveSummary: summary, publicDiscoverable: publicProfile })
      });
      if (!r.ok) throw new Error("Enregistrement impossible.");
    } catch (e) { setGeneration(e instanceof Error ? e.message : "Erreur"); } finally { setSaving(false); }
  }

  async function addImages(files: FileList | null) {
    if (!files || !limits) return;
    const room = Math.max(0, limits.images - images.length);
    const picked = Array.from(files).slice(0, room);
    const next = [...images];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      try { next.push(await compressImage(file)); } catch {}
    }
    setImages(next.slice(0, limits.images));
  }

  async function generate() {
    if (!limits || !pitchUrl) { setGeneration("Un pitch valide est nécessaire avant de générer la publicité."); return; }
    setGeneration(null); setSaving(true);
    try {
      await save();
      const session = (await getSupabaseClient().auth.getSession()).data.session;
      if (!session) throw new Error("Session requise.");
      const r = await fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const b = await r.json();
      const name = b.user?.displayName || [b.profile?.firstName, b.profile?.lastName].filter(Boolean).join(" ") || "Talent Jobly";
      const headline = b.profile?.headline || summary || "Profil professionnel disponible pour les recruteurs.";
      setGeneration("Création de la vidéo publicitaire…");
      const blob = await generateAdBlob(pitchUrl, images, name, headline, limits.ad);
      const fd = new FormData(); fd.append("file", blob, `jobly-top-talent-${Date.now()}.webm`); fd.append("durationMs", String(limits.ad * 1000));
      const upload = await fetch("/api/auth/talent-ad", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: fd });
      const result = await upload.json(); if (!upload.ok) throw new Error(result.message || "Publication impossible.");
      setAdUrl(result.advertisingVideoUrl || null); setGeneration(`Vidéo Top Talent publiée · ${limits.ad}s max.`);
    } catch (e) { setGeneration(e instanceof Error ? e.message : "Génération impossible."); } finally { setSaving(false); }
  }

  return <main className="min-h-[100dvh] bg-[#F5F7F8] pb-28 text-[#17212B]">
    <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8">
      <button onClick={() => router.back()} className="mb-6 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold">← Retour</button>
      <div className="rounded-[30px] bg-[#2E3F4F] p-6 text-white shadow-[0_18px_55px_rgba(46,63,79,.18)]">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#FFE135]">JOBLY · TALENT SHOWCASE</p>
        <h1 className="mt-2 text-4xl font-black">Construis ta vitrine recruteur.</h1>
        <p className="mt-2 text-sm text-white/70">Ton profil public reste accessible à tous les recruteurs. Pro et Premium ajoutent une vidéo publicitaire Top Talent.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-white/10 px-3 py-2">Pitch {limits ? `${limits.pitch}s max` : "Pro/Premium"}</span><span className="rounded-full bg-white/10 px-3 py-2">Images {limits ? `${limits.images} max` : "Pro/Premium"}</span><span className="rounded-full bg-white/10 px-3 py-2">Pub {limits ? `${limits.ad}s max` : "Pro/Premium"}</span></div>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs.map((x,i)=><button key={x} onClick={()=>setTab(i)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${tab===i?"bg-[#FFE135] text-[#2E3F4F]":"bg-white text-[#17212B] border border-black/10"}`}>{x}</button>)}</div>
      {tab===0 && <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
        {pitchUrl ? <video src={pitchUrl} controls playsInline className="aspect-video w-full rounded-2xl bg-[#17212B] object-cover"/> : <div className="grid aspect-video place-items-center rounded-2xl bg-[#E9EEF1] text-center text-sm font-bold">Aucun pitch publié.</div>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#5D6B76]"><span>4 MB max</span><span>•</span><span>5–{limits?.pitch || "—"} s</span><span>•</span><span>MP4 / WebM / MOV</span></div>
        {message && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{message}</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><button disabled={!limits || busy || recording} onClick={() => void startRecording()} className="rounded-full bg-[#FFE135] py-3 font-black text-[#2E3F4F]"><Video className="mr-2 inline" size={16}/> Enregistrer</button><label className="rounded-full border border-black/10 bg-[#F5F7F8] py-3 text-center font-black cursor-pointer">Importer<input id="showcase-upload" type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" disabled={!limits || busy || recording} onChange={e=>{const f=e.target.files?.[0];if(f)void onUpload(f);e.currentTarget.value=""}}/></label></div>
        
        {pitchUrl && <button disabled={busy} onClick={()=>void onDelete()} className="mt-3 w-full rounded-full border border-black/10 py-3 text-xs font-black">Supprimer le pitch</button>}
      </section>}
      {tab===1 && <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Actions illustratives</h2><span className="text-xs font-bold text-[#5D6B76]">{images.length}/{limits?.images || 0}</span></div><p className="mt-1 text-sm text-[#5D6B76]">Ajoute des images qui montrent concrètement ton expérience.</p><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>void addImages(e.target.files)}/><button disabled={!limits || images.length >= (limits?.images || 0)} onClick={()=>fileRef.current?.click()} className="mt-4 w-full rounded-full bg-[#FFE135] py-3 font-black"><ImagePlus className="mr-2 inline" size={16}/> Ajouter des images</button><div className="mt-4 grid grid-cols-3 gap-2">{images.map((src,i)=><div key={i} className="relative aspect-square overflow-hidden rounded-2xl"><img src={src} alt="" className="h-full w-full object-cover"/><button onClick={()=>setImages(v=>v.filter((_,j)=>j!==i))} className="absolute right-1 top-1 rounded-full bg-black/65 px-2 py-1 text-xs text-white">×</button></div>)}</div></section>}
      {tab===2 && <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Portfolio Business</h2><p className="mt-1 text-sm text-[#5D6B76]">Présente tes réalisations, clients, chiffres ou projets.</p><textarea value={portfolio.value} onChange={e=>setPortfolio(v=>({...v,value:e.target.value}))} className="mt-4 min-h-40 w-full rounded-2xl border border-black/10 p-4 text-sm outline-none" placeholder="Ex. portefeuille commercial, projets, résultats…"/><input value={portfolio.link} onChange={e=>setPortfolio(v=>({...v,link:e.target.value}))} className="mt-3 w-full rounded-full border border-black/10 px-4 py-3 text-sm outline-none" placeholder="Lien portfolio (optionnel)"/></section>}
      {tab===3 && <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Executive Summary</h2><p className="mt-1 text-sm text-[#5D6B76]">Le résumé qui doit apparaître dans ta vitrine recruteur.</p><textarea value={summary} onChange={e=>setSummary(e.target.value)} className="mt-4 min-h-48 w-full rounded-2xl border border-black/10 p-4 text-sm outline-none" placeholder="Qui es-tu, quelle valeur apportes-tu, quels résultats…"/><label className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F5F7F8] p-4 text-sm font-bold"><input type="checkbox" checked={publicProfile} onChange={e=>setPublicProfile(e.target.checked)}/> Profil public accessible aux recruteurs</label></section>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2"><button disabled={saving} onClick={()=>void save()} className="rounded-full border border-black/10 bg-white py-4 font-black"><Save className="mr-2 inline" size={16}/> Enregistrer</button><button disabled={saving || !limits || !pitchUrl} onClick={()=>void generate()} className="rounded-full bg-[#2E3F4F] py-4 font-black text-white disabled:opacity-40"><Sparkles className="mr-2 inline" size={16}/> Générer la vidéo Top Talent</button></div>
      {adUrl && <div className="mt-5 rounded-[28px] bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-[#5D6B76]">VIDÉO PUBLICITAIRE</p><video src={adUrl} controls playsInline className="mt-3 aspect-video w-full rounded-2xl bg-[#17212B]"/><p className="mt-2 text-xs font-bold text-[#5D6B76]">Cette vidéo apparaît en cascade sur Top Talent.</p></div>}
      {generation && <p className="mt-4 rounded-2xl bg-[#FFE135]/30 p-3 text-xs font-black">{generation}</p>}
    </div>
  </main>;
}
