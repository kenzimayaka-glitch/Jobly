import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export function adminClient() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Supabase serveur non configuré.");
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export async function authUser(request: NextRequest){
 const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,""); if(!token) return null;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; if(!url||!key) throw new Error("Supabase client non configuré.");
 const sb=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}); const {data,error}=await sb.auth.getUser(token); return error||!data.user?null:data.user;
}
export async function ensureUser(sb:ReturnType<typeof adminClient>, au:{id:string,email?:string|null,phone?:string|null,user_metadata?:Record<string,unknown>}){
 const {data}=await sb.from("User").select("*").eq("authUserId",au.id).maybeSingle(); if(data) return data;
 const displayName=(au.user_metadata?.full_name as string|undefined)||(au.user_metadata?.name as string|undefined)||null;
 const row={id:crypto.randomUUID(),authUserId:au.id,email:au.email??null,phone:au.phone??null,displayName,updatedAt:new Date().toISOString()};
 const {data:created,error}=await sb.from("User").insert(row).select("*").single(); if(error) throw new Error(error.message); return created;
}
export async function requirePremium(request:NextRequest){
 const au=await authUser(request); if(!au) return {error:"Session requise.",status:401 as const};
 const sb=adminClient(); const user=await ensureUser(sb,au);
 const {data:subs}=await sb.from("Subscription").select("plan,status,trialEndsAt").eq("userId",user.id).order("createdAt",{ascending:false}).limit(1);
 const sub=subs?.[0]; const active=sub && ["ACTIVE","TRIALING"].includes(String(sub.status)) && (sub.status!=="TRIALING" || !sub.trialEndsAt || new Date(sub.trialEndsAt)>new Date());
 if(!active || String(sub.plan)==="FREE") return {error:"Cette fonctionnalité Mobility est réservée au Premium.",status:403 as const};
 return {user,sb};
}
export function requireRole(user:any, roles:string[]){if(!roles.includes(String(user?.role||"")))return {error:"Accès non autorisé.",status:403 as const};return null;}
