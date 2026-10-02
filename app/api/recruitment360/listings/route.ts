import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import {
  checksum,
  exportFilename,
  renderJpeg,
  renderPdf,
  renderWebHtml,
  renderXlsx,
  type JpegSize,
  type ListingStage,
  type ListingTheme,
  type OfficialListingCandidate,
  type OfficialListingData,
  type OfficialListingPost,
} from "../../../../lib/recruitment360/officialListing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ExportFormat = "PDF" | "XLSX" | "WEB" | "JPEG";

const ROLES = new Set(["OWNER", "HR", "MANAGER", "DELEGATE", "DG"]);

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function authorizeRecruiter(supabase: ReturnType<typeof adminClient>, recruitmentId: string, userId: string) {
  const { data, error } = await supabase
    .from("RecruitmentRole")
    .select("role")
    .eq("recruitmentId", recruitmentId)
    .eq("userId", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.role && ROLES.has(String(data.role).toUpperCase()));
}

function stageFrom(value: unknown): ListingStage {
  const stage = String(value || "").toUpperCase();
  if (stage === "CV" || stage === "TEST" || stage === "INTERVIEW" || stage === "DECISION") return stage;
  return "CV";
}

function themeFrom(value: unknown): ListingTheme {
  const theme = String(value || "OFFICIAL_CONCOURS").toUpperCase();
  if (theme === "MODERNE" || theme === "SOBRE" || theme === "OFFICIAL_CONCOURS") return theme;
  return "OFFICIAL_CONCOURS";
}

function dossierNumber(applicationId: string) {
  return "JOB-" + applicationId.replace(/-/g, "").slice(-8).toUpperCase();
}

function qualifies(stage: ListingStage, application: any, state: any, shortlist: any, hasTest: boolean, hasInterview: boolean, hasDecision: boolean) {
  const status = String(application?.status || "").toUpperCase();
  const recruitmentStatus = String(application?.recruitment360Status || "").toUpperCase();
  if (["REJECTED", "WITHDRAWN", "RETIRED", "REFUSED", "OFFER_DECLINED"].includes(status)) return false;
  if (["REJECTED", "WITHDRAWN", "RETIRED", "REFUSED", "NON_RETENU"].includes(recruitmentStatus)) return false;

  const stateName = String(state?.currentState || "").toUpperCase();
  const shortlistStatus = String(shortlist?.status || "").toUpperCase();

  if (stage === "CV") {
    return ["SELECTED", "RETAINED", "SHORTLISTED", "CV_SELECTED"].includes(shortlistStatus)
      || ["RETAINED", "SHORTLISTED", "CV_SELECTED"].includes(stateName);
  }
  // Server-authoritative integrity rule: stage evidence alone never makes a
  // candidate publishable. TEST/INTERVIEW/DECISION require an explicit retained
  // shortlist/state signal first, preventing non-retained applicants from entering
  // an official listing even if a downstream object exists.
  const retained =
    ["SELECTED", "RETAINED", "SHORTLISTED", "CV_SELECTED", "TEST_SELECTED", "INTERVIEW_SELECTED", "FINALIST"].includes(shortlistStatus)
    || ["RETAINED", "SHORTLISTED", "CV_SELECTED", "TEST_SELECTED", "INTERVIEW_SELECTED", "FINALIST"].includes(stateName);

  if (stage === "TEST") {
    return retained && (hasTest || ["TEST", "TEST_SELECTED", "TEST_COMPLETED", "TEST_PASSED"].includes(stateName));
  }
  if (stage === "INTERVIEW") {
    return retained && (hasInterview || ["INTERVIEW", "FINALIST", "INTERVIEW_SELECTED"].includes(stateName));
  }
  return retained && (hasDecision || ["FINALIST", "DECISION", "OFFER", "HIRED"].includes(stateName));
}

async function getOrCreatePublicLink(
  supabase: ReturnType<typeof adminClient>,
  versionId: string,
  actorUserId: string,
  stage: ListingStage,
  theme: ListingTheme,
  origin: string,
) {
  const publicBase = String(process.env.JOBLY_PUBLIC_URL || origin).replace(/\/$/, "");
  const { data: block } = await supabase
    .from("RecruitmentListingImmutableBlock")
    .select("publicUrl")
    .eq("versionId", versionId)
    .maybeSingle();

  if (block?.publicUrl) {
    const match = String(block.publicUrl).match(/\/public\/recruitment-listing\/([^/?#]+)$/);
    if (match?.[1]) {
      const tokenHash = crypto.createHash("md5").update(match[1]).digest("hex");
      const { data: activeLink } = await supabase
        .from("RecruitmentListingPublicLink")
        .select("id,expiresAt,stage,theme")
        .eq("versionId", versionId)
        .eq("tokenHash", tokenHash)
        .is("revokedAt", null)
        .gt("expiresAt", new Date().toISOString())
        .maybeSingle();
      if (activeLink && activeLink.stage === stage && activeLink.theme === theme) {
        return { url: block.publicUrl, linkId: activeLink.id, expiresAt: activeLink.expiresAt };
      }
    }
  }

  const ttl = Math.max(1, Math.min(720, Number(process.env.JOBLY_LISTING_PUBLIC_LINK_TTL_HOURS || "168")));
  const { data, error } = await supabase.rpc("recruitment360_lot11_create_public_link_v2", {
    p_version_id: versionId,
    p_actor_user_id: actorUserId,
    p_ttl_hours: ttl,
    p_stage: stage,
    p_theme: theme,
  });
  if (error) throw new Error(error.message);
  const result = data as { linkId?: string; token?: string; expiresAt?: string };
  if (!result?.token || !result?.linkId) throw new Error("Impossible de créer le lien public sécurisé.");
  return {
    url: publicBase + "/public/recruitment-listing/" + result.token,
    linkId: result.linkId,
    expiresAt: result.expiresAt || null,
  };
}

async function loadListing(
  supabase: ReturnType<typeof adminClient>,
  recruitmentId: string,
  versionId: string,
  actorUserId: string,
  stage: ListingStage,
  theme: ListingTheme,
  origin: string,
  language: "fr" | "en",
): Promise<{ data: OfficialListingData; publicLinkId: string; publicExpiresAt: string | null }> {
  const { data: recruitment, error: recruitmentError } = await supabase
    .from("Recruitment360")
    .select("id,recruiterJobId,currentState,version")
    .eq("id", recruitmentId)
    .maybeSingle();
  if (recruitmentError) throw new Error(recruitmentError.message);
  if (!recruitment) throw new Error("RECRUITMENT_NOT_FOUND");
  if (recruitment.recruiterJobId == null) throw new Error("RECRUITER_JOB_NOT_FOUND");

  const { data: version, error: versionError } = await supabase
    .from("RecruitmentAnnouncementVersion")
    .select("*")
    .eq("id", versionId)
    .eq("recruitmentId", recruitmentId)
    .maybeSingle();
  if (versionError) throw new Error(versionError.message);
  if (!version) throw new Error("VERSION_NOT_FOUND");
  if (!["PUBLISHED", "EXTENDED", "CLOSED"].includes(String(version.status).toUpperCase())) {
    throw new Error("VERSION_NOT_PUBLISHED");
  }

  const [{ data: job }, { data: recruiterJob }, { data: role }] = await Promise.all([
    supabase.from("RecruiterJob").select("id,companyName,location,recruiterUserId").eq("id", recruitment.recruiterJobId).maybeSingle(),
    supabase.from("RecruiterJob").select("id,companyName,location,recruiterUserId").eq("id", recruitment.recruiterJobId).maybeSingle(),
    supabase.from("RecruitmentRole").select("userId,role").eq("recruitmentId", recruitmentId).in("role", Array.from(ROLES)).order("createdAt", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (!job && !recruiterJob) throw new Error("RECRUITER_JOB_NOT_FOUND");

  const companyName = String((recruiterJob || job)?.companyName || "Organisation");
  const companyLocation = String((recruiterJob || job)?.location || "");
  const recruiterUserId = String((recruiterJob || job)?.recruiterUserId || role?.userId || actorUserId);

  const publicLink = await getOrCreatePublicLink(supabase, versionId, actorUserId, stage, theme, origin);
  const qrPayload = publicLink.url;
  const canonicalChecksum = crypto.createHash("sha256").update(JSON.stringify({
    defaultText: "Propulsé par Jobly",
    publicUrl: publicLink.url,
    qrPayload,
    logoKey: "jobly",
  })).digest("hex");
  const { data: existingBlock } = await supabase
    .from("RecruitmentListingImmutableBlock")
    .select("id,publicUrl,qrPayload,checksum")
    .eq("versionId", versionId)
    .maybeSingle();
  if (existingBlock && (existingBlock.publicUrl !== publicLink.url || existingBlock.qrPayload !== qrPayload || existingBlock.checksum !== canonicalChecksum)) {
    throw new Error("JOBLY_BLOCK_INTEGRITY_FAILED");
  }
  if (!existingBlock) {
    const { error: blockError } = await supabase.from("RecruitmentListingImmutableBlock").insert({
      versionId,
      defaultText: "Propulsé par Jobly",
      publicUrl: publicLink.url,
      qrPayload,
      logoKey: "jobly",
      checksum: canonicalChecksum,
    });
    if (blockError) throw new Error(blockError.message);
  }

  const { data: applications, error: appError } = await supabase
    .from("Application")
    .select("id,userId,status,recruitment360Status,officialListingConsent,officialListingDisplayName")
    .eq("recruiterJobId", recruitment.recruiterJobId);
  if (appError) throw new Error(appError.message);

  const appRows = applications || [];
  const appIds = appRows.map((a: any) => a.id);
  const userIds = appRows.map((a: any) => a.userId).filter(Boolean);

  const [statesRes, shortlistsRes, testsRes, interviewsRes, decisionsRes, profilesRes, errataRes] = await Promise.all([
    appIds.length ? supabase.from("RecruitmentApplicationState").select("applicationId,currentState,stepNumber").in("applicationId", appIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("RecruitmentShortlist").select("applicationId,status,rank").eq("recruitmentId", recruitmentId),
    appIds.length ? supabase.from("RecruitmentTestSession").select("applicationId,id,status").in("applicationId", appIds) : Promise.resolve({ data: [], error: null }),
    appIds.length ? supabase.from("RecruitmentInterview").select("applicationId,id,status").in("applicationId", appIds) : Promise.resolve({ data: [], error: null }),
    appIds.length ? supabase.from("RecruitmentDecision").select("applicationId,id,outcome").in("applicationId", appIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? supabase.from("Profile").select("userId,firstName,lastName").in("userId", userIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("RecruitmentListingErratum").select("erratumNumber,summary,details").eq("versionId", versionId).order("erratumNumber", { ascending: true }),
  ]);
  for (const result of [statesRes, shortlistsRes, testsRes, interviewsRes, decisionsRes, profilesRes, errataRes]) {
    if (result.error) throw new Error(result.error.message);
  }

  const states = new Map((statesRes.data || []).map((x: any) => [x.applicationId, x]));
  const shortlists = new Map((shortlistsRes.data || []).map((x: any) => [x.applicationId, x]));
  const tests = new Set((testsRes.data || []).map((x: any) => x.applicationId));
  const interviews = new Set((interviewsRes.data || []).map((x: any) => x.applicationId));
  const decisions = new Set((decisionsRes.data || []).map((x: any) => x.applicationId));
  const profiles = new Map((profilesRes.data || []).map((x: any) => [String(x.userId), x]));

  const eligible = appRows
    .filter((a: any) => qualifies(stage, a, states.get(a.id), shortlists.get(a.id), tests.has(a.id), interviews.has(a.id), decisions.has(a.id)))
    .map((a: any) => {
      const p = profiles.get(String(a.userId));
      return {
        applicationId: a.id,
        dossierNumber: dossierNumber(a.id),
        firstName: p?.firstName || null,
        lastName: p?.lastName || null,
        displayNameOverride: a.officialListingDisplayName || null,
        consented: Boolean(a.officialListingConsent),
      } satisfies OfficialListingCandidate;
    });

  const data: OfficialListingData = {
    recruitmentId,
    versionId,
    versionNumber: Number(version.versionNumber || 1),
    companyName,
    city: companyLocation,
    stage,
    language,
    theme,
    publicUrl: publicLink.url,
    qrPayload,
    generatedAt: new Date().toISOString(),
    signerTitle: "La Direction Générale",
    posts: [{
      title: String(version.title || "Poste"),
      candidates: eligible,
    }],
    errata: (errataRes.data || []).map((e: any) => ({ number: Number(e.erratumNumber), summary: e.summary, details: e.details })),
  };

  return { data, publicLinkId: publicLink.linkId, publicExpiresAt: publicLink.expiresAt };
}

async function saveExport(
  supabase: ReturnType<typeof adminClient>,
  data: OfficialListingData,
  actorUserId: string,
  format: ExportFormat,
  storagePath: string | null,
  digest: string | null,
  width: number | null,
  height: number | null,
  metadata: Record<string, unknown>,
  expiresAt: string | null,
) {
  const { data: row, error } = await supabase
    .from("RecruitmentListingExport")
    .insert({
      versionId: data.versionId,
      format,
      theme: data.theme,
      width,
      height,
      storagePath,
      checksum: digest,
      status: "READY",
      expiresAt,
      metadata,
      createdByUserId: actorUserId,
      completedAt: new Date().toISOString(),
    })
    .select("id,status,storagePath,checksum,width,height,expiresAt")
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return bad("Session requise.", 401);
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { data: roles, error: roleError } = await supabase
      .from("RecruitmentRole")
      .select("recruitmentId,role")
      .eq("userId", user.id)
      .in("role", Array.from(ROLES));
    if (roleError) throw new Error(roleError.message);
    const recruitmentIds = Array.from(new Set((roles || []).map((r:any)=>r.recruitmentId).filter(Boolean)));
    if (!recruitmentIds.length) return NextResponse.json({ ok:true, recruitments:[] });
    const { data: recruitments, error } = await supabase
      .from("Recruitment360")
      .select("id,recruiterJobId,currentState,version,updatedAt")
      .in("id", recruitmentIds)
      .order("updatedAt", { ascending:false });
    if (error) throw new Error(error.message);
    const jobIds=(recruitments||[]).map((r:any)=>r.recruiterJobId).filter(Boolean);
    const versionIds=(recruitments||[]).map((r:any)=>r.id);
    const [jobsRes,versionsRes]=await Promise.all([
      jobIds.length ? supabase.from("RecruiterJob").select("id,title,companyName,status").in("id",jobIds) : Promise.resolve({data:[],error:null}),
      versionIds.length ? supabase.from("RecruitmentAnnouncementVersion").select("id,recruitmentId,versionNumber,title,status").in("recruitmentId",versionIds).order("versionNumber",{ascending:false}) : Promise.resolve({data:[],error:null}),
    ]);
    if (jobsRes.error) throw new Error(jobsRes.error.message);
    if (versionsRes.error) throw new Error(versionsRes.error.message);
    const jobs=new Map((jobsRes.data||[]).map((j:any)=>[j.id,j]));
    const versionsByRecruitment=new Map<string,any[]>();
    for(const v of (versionsRes.data||[])) {
      const list=versionsByRecruitment.get(v.recruitmentId)||[];
      list.push(v);
      versionsByRecruitment.set(v.recruitmentId,list);
    }
    return NextResponse.json({
      ok:true,
      recruitments:(recruitments||[]).map((r:any)=>({
        ...r,
        job:jobs.get(r.recruiterJobId)||null,
        versions:versionsByRecruitment.get(r.id)||[],
      })),
    });
  } catch(error) {
    return NextResponse.json({ok:false,message:error instanceof Error?error.message:"Impossible de charger les recrutements."},{status:500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return bad("Session requise.", 401);
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await request.json().catch(() => ({}));
    const recruitmentId = String(body.recruitmentId || "").trim();
    const versionId = String(body.versionId || "").trim();
    if (!recruitmentId || !versionId) return bad("recruitmentId et versionId sont requis.");
    if (!(await authorizeRecruiter(supabase, recruitmentId, user.id))) return bad("Accès recruteur refusé.", 403);

    const format = String(body.format || "PDF").toUpperCase() as ExportFormat;
    if (!["PDF", "XLSX", "WEB", "JPEG"].includes(format)) return bad("Format non supporté.");
    const theme = themeFrom(body.theme);
    const stage = stageFrom(body.stage);
    const language = String(body.language || "fr").toLowerCase() === "en" ? "en" : "fr";

    const { data, publicLinkId, publicExpiresAt } = await loadListing(
      supabase,
      recruitmentId,
      versionId,
      user.id,
      stage,
      theme,
      request.nextUrl.origin,
      language,
    );

    const bucket = "recruitment-listings";
    let files: { buffer: Buffer; filename: string; width: number; height: number }[] = [];
    let bodyBuffer: Buffer | null = null;
    let contentType = "application/octet-stream";
    let width: number | null = null;
    let height: number | null = null;
    let metadata: Record<string, unknown> = { stage, candidateCount: data.posts.reduce((n, p) => n + p.candidates.length, 0), publicLinkId };

    if (format === "PDF") {
      bodyBuffer = await renderPdf(data);
      contentType = "application/pdf";
    } else if (format === "XLSX") {
      bodyBuffer = await renderXlsx(data);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (format === "WEB") {
      const html = renderWebHtml(data);
      bodyBuffer = Buffer.from(html, "utf8");
      contentType = "text/html; charset=utf-8";
      metadata = { ...metadata, dynamicPublicPage: data.publicUrl, noIndex: true, iframeCode: `<iframe src="${data.publicUrl}" loading="lazy" style="width:100%;min-height:720px;border:0" title="Listing officiel Jobly"></iframe>` };
    } else {
      const requested = body.size === "640" ? { width: 640, height: 1280 } : body.size === "2160" ? { width: 2160, height: 4320 } : { width: 4320, height: 8640 };
      const result = await renderJpeg(data, requested as JpegSize);
      files = result.files;
      width = result.effectiveSize.width;
      height = result.effectiveSize.height;
      metadata = { ...metadata, pages: result.pages, requestedSize: requested, effectiveSize: result.effectiveSize, fallback: result.fallback };
    }

    if (format === "JPEG") {
      const uploaded: string[] = [];
      for (const file of files) {
        const path = `${recruitmentId}/${versionId}/${file.filename}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });
        if (error) throw new Error(error.message);
        uploaded.push(path);
      }
      const digest = checksum(Buffer.concat(files.map(f => f.buffer)));
      const row = await saveExport(supabase, data, user.id, format, uploaded[0] || null, digest, width, height, { ...metadata, storagePaths: uploaded }, publicExpiresAt);
      return NextResponse.json({ ok: true, export: row, storagePaths: uploaded, ...metadata });
    }

    if (!bodyBuffer) throw new Error("EXPORT_BUFFER_EMPTY");
    const filename = exportFilename(data, format);
    const storagePath = `${recruitmentId}/${versionId}/${filename}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, bodyBuffer, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
    const digest = checksum(bodyBuffer);
    const row = await saveExport(supabase, data, user.id, format, storagePath, digest, width, height, metadata, publicExpiresAt);
    const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
    if (signError) throw new Error(signError.message);
    return NextResponse.json({ ok: true, export: row, publicUrl: data.publicUrl, downloadUrl: signed?.signedUrl || null, ...metadata });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export impossible.";
    const status = message === "FORBIDDEN" ? 403 : message.endsWith("_NOT_FOUND") ? 404 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
