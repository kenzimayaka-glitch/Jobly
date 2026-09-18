"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {getSupabaseClient} from "@/lib/supabase";

type Msg={id:string;role:"user"|"assistant"|"system";content:string;metadata?:any;createdAt:string};

export default function JiaCEOChat(){
  const router=useRouter();
  const [messages,setMessages]=useState<Msg[]>([]);
  const [text,setText]=useState("");
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{(async()=>{
    const s=await getSupabaseClient().auth.getSession();
    if(!s.data.session){router.replace("/");return;}
    const r=await fetch("/api/admin/jia/chat",{headers:{Authorization:"Bearer "+s.data.session.access_token}});
    if(!r.ok){router.replace("/ecosystem");return;}
    setLoading(false);
  })().catch(()=>router.replace("/ecosystem"))},[router]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages,sending]);

  async function send(e?:FormEvent){
    e?.preventDefault();
    const value=text.trim(); if(!value||sending)return;
    setError("");setSending(true);setText("");
    const optimistic:Msg={id:"local-"+Date.now(),role:"user",content:value,createdAt:new Date().toISOString()};
    setMessages(m=>[...m,optimistic]);
    try{
      const s=await getSupabaseClient().auth.getSession();
      const r=await fetch("/api/admin/jia/chat",{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+s.data.session?.access_token},body:JSON.stringify({message:value,conversationId})});
      const b=await r.json();
      if(!r.ok)throw new Error(b.message||"Erreur J’IA.");
      if(!conversationId)setConversationId(b.conversationId);
      setMessages(m=>[...m,b.message]);
    }catch(e){setError(e instanceof Error?e.message:"J’IA indisponible.");}
    finally{setSending(false);}
  }

  function newChat(){setConversationId(null);setMessages([]);setError("");}

  if(loading)return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Ouverture de J’IA…</main>;
  return <main className="min-h-[100dvh] bg-[#F7FAFF] text-navy">
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-4 sm:px-6">
      <header className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-500">JOBLY · ADMIN</p><h1 className="text-xl font-black">J’IA · CEO Copilot</h1><p className="text-xs text-slate-500">Vision · stratégie · produit · technique · commercial · opérations</p></div>
        <div className="flex gap-2"><button onClick={newChat} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">Nouvelle discussion</button><button onClick={()=>router.push("/admin/jia")} className="rounded-xl bg-[#0B2A5B] px-3 py-2 text-xs font-bold text-white">Cockpit</button></div>
      </header>
      <section className="mt-3 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
        {!messages.length&&!sending&&<div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center"><div className="text-4xl">✦</div><h2 className="mt-3 text-2xl font-black">Je connais JOBLY.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">J’IA dispose de la mémoire institutionnelle de JOBLY : vision, produit, architecture technique, modèle commercial, gouvernance, rôles et état de maturité. Tu peux aussi lui demander d’analyser les KPI du cockpit.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["Quelle est la vision 20/20 de JOBLY ?","Explique-moi l’architecture de J’IA.","Quels sont nos axes commerciaux ?","Que reste-t-il à valider techniquement ?"].map(q=><button key={q} onClick={()=>setText(q)} className="rounded-full border px-3 py-2 text-xs font-semibold hover:bg-slate-50">{q}</button>)}</div></div>}
        <div className="space-y-4">{messages.map(m=><div key={m.id} className={m.role==="user"?"ml-auto max-w-[85%]":"max-w-[92%]"}><div className={m.role==="user"?"rounded-2xl rounded-br-md bg-[#0B2A5B] px-4 py-3 text-sm text-white":"rounded-2xl rounded-bl-md bg-[#F3F6FA] px-4 py-3 text-sm leading-6"}>{m.content}</div>{m.role==="assistant"&&m.metadata?.sources?.length>0&&<div className="mt-1 text-[10px] text-slate-400">Sources : {m.metadata.sources.map((s:any)=>s.title).join(" · ")}</div>}</div>)}{sending&&<div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#F3F6FA] px-4 py-3 text-sm text-slate-500">J’IA analyse le contexte JOBLY…</div>}<div ref={endRef}/></div>
      </section>
      {error&&<p className="px-2 py-2 text-xs font-semibold text-red-600">{error}</p>}
      <form onSubmit={send} className="mt-3 flex gap-2 rounded-2xl bg-white p-2 shadow-sm"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Parle à J’IA de JOBLY…" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"/><button disabled={!text.trim()||sending} className="rounded-xl bg-[#0B2A5B] px-5 py-3 text-sm font-black text-white disabled:opacity-40">{sending?"…":"Envoyer"}</button></form>
    </div>
  </main>;
}
