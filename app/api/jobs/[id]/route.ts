import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
import { resolveApplicationContact } from "../../../../lib/applicationEngine";
import { cleanCompanyName, cleanJobDescription, cleanJobTitle, extractCompanyNameFromDescription, parseJobDetailSections } from "../../../../lib/jobContent";
import { normalizeJobContent, normalizeJobIdentity } from "../../../../lib/jobNormalizer";

function companyDomain(website:string|null|undefined):string|null { if(!website) return null; try { const raw=website.startsWith("http")?website:`https://${website}`; return new URL(raw).hostname.toLowerCase().replace(/^www\\./,"") || null; } catch { return null; } }

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const source = new URL(request.url).searchParams.get("source");
    if (!id || (source !== "discovery" && source !== "recruiter")) {
      return NextResponse.json({ message: "Offre invalide." }, { status: 400 });
    }
    const supabase = adminClient();
    if (source === "discovery") {
      const { data, error } = await supabase.from("Job")
        .select("id,title,description,location,contractType,remoteMode,minExperienceYears,salaryMin,salaryMax,salaryCurrency,deadline,createdAt,sourceUrl,source,applicationReady,applicationProfile,tags,aiSector,normalizedContent,company:Company(name,logoUrl,website,description)")
        .eq("id", id).eq("isActive", true).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ message: "Offre introuvable ou inactive." }, { status: 404 });
      const platformExpiration = new Date(new Date(data.createdAt).setMonth(new Date(data.createdAt).getMonth() + 2));
      if (!Number.isFinite(platformExpiration.getTime()) || platformExpiration.getTime() <= Date.now()) {
        await supabase.from("Job").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
        return NextResponse.json({ message: "Offre expirée." }, { status: 404 });
      }
      const company = Array.isArray(data.company) ? data.company[0] : data.company;
      const normalizedContent = (data as any).normalizedContent || null;
      const structuredDescription = Array.isArray(normalizedContent?.description) ? normalizedContent.description.join("\n\n") : "";
      const normalized = normalizeJobIdentity({ title: normalizedContent?.title || data.title, companyName: normalizedContent?.company || company?.name, description: structuredDescription || data.description });
      const canonicalContent = normalizedContent || normalizeJobContent({ title: data.title, companyName: company?.name, description: data.description, location: data.location, contractType: data.contractType, remoteMode: data.remoteMode, salaryMin: data.salaryMin, salaryMax: data.salaryMax, salaryCurrency: data.salaryCurrency, deadline: data.deadline, source: data.source, sourceUrl: data.sourceUrl });
      const canonicalApplicationText = Array.isArray(canonicalContent?.application) ? canonicalContent.application.join("\n") : "";
      const cleanedTitle = normalized.title; const cleanedDescription = normalized.description; const cleanedCompanyName = normalized.companyName; const contacts = resolveApplicationContact((data.applicationProfile || {}) as Record<string, unknown>, canonicalApplicationText);
      const applicationProfile = { ...(data.applicationProfile || {}), ...(contacts.email ? { applicationEmail: contacts.email } : {}), ...(contacts.phone ? { applicationPhone: contacts.phone } : {}) };
      const parsedSections = normalizedContent && Object.values(normalizedContent).some((v:any)=>Array.isArray(v)&&v.length) ? { description: normalizedContent.description||[], missions: normalizedContent.missions||[], profile: normalizedContent.profile||[], education: normalizedContent.education||[], experience: normalizedContent.experience||[], skills: normalizedContent.skills||[], qualities: normalizedContent.qualities||[], benefits: normalizedContent.benefits||[], application: normalizedContent.application||[] } : parseJobDetailSections(cleanedDescription || data.description, cleanedTitle);
      const detailSections = Object.values(parsedSections).some((items) => Array.isArray(items) && items.length)
        ? parsedSections
        : (String(data.description || "").trim() ? { ...parsedSections, description: [String(data.description).trim()] } : parsedSections);
      const publishedAt = data.createdAt;
      const expirationAt = new Date(new Date(data.createdAt).setMonth(new Date(data.createdAt).getMonth() + 2)).toISOString();
      const deadlineExpired = Boolean(data.deadline && new Date(data.deadline).getTime() < Date.now());
      return NextResponse.json({ source, job: { ...data, title: cleanedTitle, description: cleanedDescription, publishedAt, expirationAt, deadlineExpired, offerStatus: deadlineExpired ? "EXPIRED" : "ACTIVE", applicationProfile, company: company ? { ...company, name: cleanedCompanyName, domain: companyDomain(company.website) } : (cleanedCompanyName ? { name: cleanedCompanyName, logoUrl: null, website: null, description: null, domain: null } : null),
          displayTitle: cleanedTitle,
          displayCompanyName: cleanedCompanyName,
          detailSections } });
    }
    const { data, error } = await supabase.from("RecruiterJob")
      .select("id,title,description,location,contract,remoteMode,minExperienceYears,salary,sector,tags,createdAt,companyName,sourceUrl,sourcePlatform,applicationReady,applicationProfile")
      .eq("id", id).eq("status", "published").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Offre introuvable ou non publiée." }, { status: 404 });
    const platformExpiration = new Date(new Date(data.createdAt).setMonth(new Date(data.createdAt).getMonth() + 2));
    if (!Number.isFinite(platformExpiration.getTime()) || platformExpiration.getTime() <= Date.now()) {
      return NextResponse.json({ message: "Offre expirée." }, { status: 404 });
    }
    const normalized = normalizeJobIdentity({ title: data.title, companyName: data.companyName, description: data.description });
    const cleanedTitle = normalized.title; const cleanedDescription = normalized.description; const cleanedCompanyName = normalized.companyName; const contacts = resolveApplicationContact((data.applicationProfile || {}) as Record<string, unknown>, cleanedDescription);
    const applicationProfile = { ...(data.applicationProfile || {}), ...(contacts.email ? { applicationEmail: contacts.email } : {}), ...(contacts.phone ? { applicationPhone: contacts.phone } : {}) };
    const parsedSections = parseJobDetailSections(cleanedDescription || data.description, cleanedTitle);
    const detailSections = Object.values(parsedSections).some((items) => Array.isArray(items) && items.length)
      ? parsedSections
      : (String(data.description || "").trim() ? { ...parsedSections, description: [String(data.description).trim()] } : parsedSections);
    return NextResponse.json({ source, job: { ...data, title: cleanedTitle, description: cleanedDescription, companyName: cleanedCompanyName, displayTitle: cleanedTitle, displayCompanyName: cleanedCompanyName,
          detailSections, applicationProfile } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger l'offre." }, { status: 500 });
  }
}
