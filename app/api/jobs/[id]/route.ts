import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
import { resolveApplicationContact } from "../../../../lib/applicationEngine";
import { buildCanonicalOffer } from "../../../../lib/offerBlocks";

function companyDomain(website:string|null|undefined):string|null { if(!website) return null; try { const raw=website.startsWith("http")?website:`https://${website}`; return new URL(raw).hostname.toLowerCase().replace(/^www\\./,"") || null; } catch { return null; } }

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request:NextRequest, context:Context) {
  try {
    const { id }=await context.params;
    const source=new URL(request.url).searchParams.get("source");
    if(!id || (source!=="discovery" && source!=="recruiter")) {
      return NextResponse.json({message:"Offre invalide."},{status:400});
    }
    const supabase=adminClient();

    if(source==="discovery") {
      const {data,error}=await supabase.from("Job")
        .select("id,title,description,location,contractType,remoteMode,minExperienceYears,salaryMin,salaryMax,salaryCurrency,deadline,createdAt,sourceUrl,source,sourceKey,applicationReady,applicationProfile,tags,aiSector,normalizedContent,company:Company(name,logoUrl,website,description)")
        .eq("id",id).eq("isActive",true).maybeSingle();
      if(error) throw new Error(error.message);
      if(!data) return NextResponse.json({message:"Offre introuvable ou inactive."},{status:404});

      const platformExpiration=new Date(new Date(data.createdAt).setMonth(new Date(data.createdAt).getMonth()+2));
      const platformExpired=Number.isFinite(platformExpiration.getTime()) && platformExpiration.getTime()<=Date.now();
      if(platformExpired && !data.deadline) {
        return NextResponse.json({message:"Offre expirée."},{status:404});
      }

      const company=Array.isArray(data.company)?data.company[0]:data.company;
      const canonical=buildCanonicalOffer({
        title:data.title,description:data.description,location:data.location,
        contractType:data.contractType,remoteMode:data.remoteMode,
        salaryMin:data.salaryMin,salaryMax:data.salaryMax,salaryCurrency:data.salaryCurrency,
        deadline:data.deadline,source:data.source,sourceKey:data.sourceKey,sourceUrl:data.sourceUrl,
        companyName:company?.name,normalizedContent:data.normalizedContent,
      });
      const contacts=resolveApplicationContact((data.applicationProfile||{}) as Record<string,unknown>,canonical.application.join("\n"));
      const applicationProfile={
        ...(data.applicationProfile||{}),
        ...(contacts.email?{applicationEmail:contacts.email}:{}),
        ...(contacts.phone?{applicationPhone:contacts.phone}:{}),
      };
      const deadlineExpired=Boolean(canonical.deadline && new Date(canonical.deadline).getTime()<Date.now());
      const expired=platformExpired||deadlineExpired;
      const publishedAt=data.createdAt;
      const expirationAt=platformExpiration.toISOString();
      const notification=expired?{
        type:"JOB_EXPIRED",title:"Offre expirée",
        message:"Cette offre a dépassé sa période de visibilité sur Jobly et ne doit plus être utilisée pour candidater.",
        action:"VIEW_OTHER_OFFERS",
      }:null;

      return NextResponse.json({
        source,notification,
        job:{
          ...data,
          title:canonical.title||data.title,
          description:canonical.description.join("\n\n"),
          publishedAt,expirationAt,platformExpired,deadlineExpired,
          offerStatus:expired?"EXPIRED":"ACTIVE",
          applicationReady:expired?false:data.applicationReady,
          applicationProfile,
          company:company?{...company,name:canonical.company||company.name,domain:companyDomain(company.website)}
            :(canonical.company?{name:canonical.company,logoUrl:null,website:null,description:null,domain:null}:null),
          displayTitle:canonical.title,displayCompanyName:canonical.company,
          canonicalOffer:canonical,detailSections:canonical,
        },
      });
    }

    const {data,error}=await supabase.from("RecruiterJob")
      .select("id,title,description,location,contract,remoteMode,minExperienceYears,salary,sector,tags,createdAt,companyName,sourceUrl,sourcePlatform,applicationReady,applicationProfile")
      .eq("id",id).eq("status","published").maybeSingle();
    if(error) throw new Error(error.message);
    if(!data) return NextResponse.json({message:"Offre introuvable ou non publiée."},{status:404});

    const platformExpiration=new Date(new Date(data.createdAt).setMonth(new Date(data.createdAt).getMonth()+2));
    if(!Number.isFinite(platformExpiration.getTime()) || platformExpiration.getTime()<=Date.now()) {
      return NextResponse.json({message:"Offre expirée."},{status:404});
    }

    const canonical=buildCanonicalOffer({
      title:data.title,companyName:data.companyName,description:data.description,
      location:data.location,contractType:data.contract,remoteMode:data.remoteMode,
      salary:data.salary,source:data.sourcePlatform,sourceType:"JOBLY",sourceUrl:data.sourceUrl,
    });
    const contacts=resolveApplicationContact((data.applicationProfile||{}) as Record<string,unknown>,canonical.application.join("\n"));
    const applicationProfile={
      ...(data.applicationProfile||{}),
      ...(contacts.email?{applicationEmail:contacts.email}:{}),
      ...(contacts.phone?{applicationPhone:contacts.phone}:{}),
    };

    return NextResponse.json({
      source,
      job:{
        ...data,
        title:canonical.title||data.title,
        description:canonical.description.join("\n\n"),
        companyName:canonical.company,
        displayTitle:canonical.title,displayCompanyName:canonical.company,
        canonicalOffer:canonical,detailSections:canonical,applicationProfile,
      },
    });
  } catch(error) {
    return NextResponse.json({message:error instanceof Error?error.message:"Impossible de charger l'offre."},{status:500});
  }
}
