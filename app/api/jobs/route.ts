import { resolveApplicationContact } from "../../../lib/applicationEngine";
import { cleanCompanyName, cleanJobDescription, cleanJobTitle, extractCompanyNameFromDescription } from "../../../lib/jobContent";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { detectLanguageRequirements, normalizeJobLanguage } from "../../../lib/jobLanguage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_FEED_SIZE = 200;
const MAX_FEED_SIZE = 200;

type Profile = { targetRoles: string[] | null; targetCities: string[] | null; contractPreferences: string[] | null; remotePreference: string | null; preferredSectors?: string[] | null; location?: string | null; headline?: string | null; summary?: string | null };
type Skill = { name: string; level?: string | null };
type Education = { degree?: string | null; field?: string | null };
type Experience = { startDate: string; title?: string | null; description?: string | null };
type NormalizedContent = { version?:string; title?:string|null; company?:string|null; location?:string[]; contractType?:string|null; remoteMode?:string|null; salary?:{min:number|null;max:number|null;currency:string|null}; deadline?:string|null; description?:string[]; missions?:string[]; profile?:string[]; education?:string[]; experience?:string[]; skills?:string[]; qualities?:string[]; benefits?:string[]; application?:string[]; sector?:string|null; source?:{name?:string;url?:string}; qualityScore?:number|null };
type Job = { id:string; opportunityType?:string|null; title:string; description:string; location:string|null; contractType:string|null; remoteMode:string|null; minExperienceYears:number|null; isActive:boolean; createdAt:string; companyId:string|null; source:string|null; sourceUrl:string|null; deadline:string|null; lastSeenAt:string|null; sourcePublishedAt:string|null; applicationReady:boolean; applicationProfile:Record<string,unknown>; visualUrl:string|null; visualSource:string|null; applicationCheckedAt:string|null; language?:string|null; languageOriginal?:string|null; languageRequirements?:string[]|null; aiSector?:string|null; normalizedContent?:NormalizedContent|null; aiSkills?:unknown; tags?:string[] };
type Company = { id:string; name:string; logoUrl:string|null; description:string|null; website:string|null; verified:boolean };
function isGenericCompanyName(name:string|null|undefined){const n=normalize(name);return !n||n==="entreprise"||n==="employeur non precise"||n==="entreprise de la place";}
function companyDomain(website:string|null|undefined):string|null { if(!website) return null; try { const raw=website.startsWith("http")?website:`https://${website}`; return new URL(raw).hostname.toLowerCase().replace(/^www\\./,"") || null; } catch { return null; } }
type RecruiterJobRow = { id:string; title:string; companyName:string; description:string; location:string|null; contract:string|null; remoteMode:string|null; minExperienceYears:number|null; status:string; createdAt:string; sourceType:string; sourceUrl:string|null; sourcePlatform:string|null; applicationReady:boolean; applicationProfile:Record<string,unknown>; visualUrl:string|null; visualSource:string|null; applicationCheckedAt:string|null; sector?:string|null; tags?:string[]; language?:string|null; languageRequirements?:string[]|null };
type MatchableJob = { title:string; description?:string|null; location:string|null; contractType:string|null; remoteMode:string|null; minExperienceYears:number|null; sector?:string|null; tags?:string[]; language?:string|null; languageRequirements?:string[]|null };

function computeYearsExperience(experiences:Experience[]):number|null { if(!experiences.length)return null; const earliest=experiences.map(e=>new Date(e.startDate).getTime()).filter(t=>!Number.isNaN(t)).sort((a,b)=>a-b)[0]; if(earliest===undefined)return null; return Math.max(0,Math.floor((Date.now()-earliest)/(1000*60*60*24*365))); }
function normalize(value:string|null|undefined):string { return (value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function addMonths(date: Date, months: number): Date { const next = new Date(date); next.setMonth(next.getMonth() + months); return next; }
function platformExpiration(createdAt:string):Date|null { const d=new Date(createdAt); return Number.isFinite(d.getTime()) ? addMonths(d,2) : null; }
function deadlineExpired(deadline:string|null|undefined):boolean { if(!deadline)return false; const d=new Date(deadline); return Number.isFinite(d.getTime()) && d.getTime() < Date.now(); }
type MatchCriterion = { id:string; label:string; score:number|null; weight:number; required:boolean; status:"MATCH"|"PARTIAL"|"MISMATCH"|"UNKNOWN"; candidateValue?:string|null; expectedValue?:string|null };
const WEIGHTS:Record<string,number>={role:20,skills:30,experience:20,education:12,language:10,location:5,sector:2,contract:1};
function detectExp(text:string,min:number|null){if(min!=null&&min>0)return min;const m=normalize(text).match(/(?:minimum|min|au moins|plus de)\s*(\d+)\s*(?:ans?|annees?|years?)/);return m?Number(m[1]):null;}
function detectEdu(text:string){const n=normalize(text);if(/bac\s*\+\s*5|bac5|master|mba|ingenieur|doctorat|phd/.test(n))return 5;if(/bac\s*\+\s*4|bac4|maitrise/.test(n))return 4;if(/bac\s*\+\s*3|bac3|licence|bachelor/.test(n))return 3;if(/bac\s*\+\s*2|bac2|bts|dut|deug/.test(n))return 2;if(/baccalaureat|high school/.test(n))return 0;return null;}
function eduLevel(value:string|null|undefined){const n=normalize(value);if(!n)return null;if(/doctorat|phd/.test(n))return 6;if(/master|mba|ingenieur|engineering/.test(n))return 5;if(/maitrise/.test(n))return 4;if(/licence|bachelor/.test(n))return 3;if(/bts|dut|deug|bac\s*\+\s*2/.test(n))return 2;if(/bac|baccalaureat|high school/.test(n))return 0;return null;}
function languageReq(text:string){ return detectLanguageRequirements(text); }\n
