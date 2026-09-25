import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";\n\nfunction companyDomain(website:string|null|undefined):string|null { if(!website) return null; try { const raw=website.startsWith("http")?website:`https://${website}`; return new URL(raw).hostname.toLowerCase().replace(/^www\\./,"") || null; } catch { return null; } }

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
        .select("id,title,description,location,contractType,remoteMode,minExperienceYears,salaryMin,salaryMax,salaryCurrency,deadline,createdAt,company:Company(name,logoUrl,website,description)")
        .eq("id", id).eq("isActive", true).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ message: "Offre introuvable ou inactive." }, { status: 404 });
      return NextResponse.json({ source, job: { ...data, company: data.company ? { ...data.company, domain: companyDomain(data.company.website) } : null } });
    }
    const { data, error } = await supabase.from("RecruiterJob")
      .select("id,title,description,location,contract,remoteMode,minExperienceYears,salary,sector,tags,createdAt,companyName")
      .eq("id", id).eq("status", "published").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Offre introuvable ou non publiée." }, { status: 404 });
    return NextResponse.json({ source, job: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger l'offre." }, { status: 500 });
  }
}
