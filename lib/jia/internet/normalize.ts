import crypto from "node:crypto";
export function normalizeText(v:string){return v.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();}
export function tokenize(v:string){return normalizeText(v).split(" ").filter(x=>x.length>2).slice(0,120);}
export function overlap(a:string,b:string){const aa=new Set(tokenize(a)),bb=new Set(tokenize(b));if(!aa.size||!bb.size)return 0;let n=0;for(const x of aa)if(bb.has(x))n++;return n/Math.max(aa.size,bb.size);}
export function sha256(v:string){return crypto.createHash("sha256").update(v).digest("hex");}