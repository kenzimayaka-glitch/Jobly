import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") return { response: NextResponse.json({ message: "Espace ADMIN requis." }, { status: 403 }) };
  const { data: identity, error } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) return { response: NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 }) };
  return { db, user };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const status = String(request.nextUrl.searchParams.get("status") || "OPEN").toUpperCase();
    if (!["OPEN","RESOLVED","DISMISSED","ALL"].includes(status)) return NextResponse.json({ message: "Filtre invalide." }, { status: 400 });
    let query = access.db.from("AdminCommunityReport").select("*").order("createdAt", { ascending: false }).limit(150);
    if (status !== "ALL") query = query.eq("status", status);
    const { data: reports, error } = await query;
    if (error) throw new Error(error.message);
    const rows = reports || [];
    if (!rows.length) return NextResponse.json({ reports: [] });
    const postIds = [...new Set(rows.map((row: {postId:string}) => row.postId))];
    const communityIds = [...new Set(rows.map((row: {communityId:string}) => row.communityId))];
    const reporterIds = [...new Set(rows.map((row: {reporterUserId:string}) => row.reporterUserId))];
    const [{data:posts,error:postError},{data:communities,error:communityError},{data:reporters,error:reporterError}] = await Promise.all([
      access.db.from("CommunityPost").select("id,communityId,authorId,content,status,createdAt").in("id", postIds),
      access.db.from("Community").select("id,name,category").in("id", communityIds),
      access.db.from("User").select("id,displayName,username,email").in("id", reporterIds),
    ]);
    if (postError) throw new Error(postError.message);
    if (communityError) throw new Error(communityError.message);
    if (reporterError) throw new Error(reporterError.message);
    const authors = [...new Set((posts || []).map((post: {authorId:string}) => post.authorId))];
    const { data: authorRows, error: authorError } = authors.length
      ? await access.db.from("User").select("id,displayName,username").in("id", authors)
      : { data: [], error: null };
    if (authorError) throw new Error(authorError.message);
    return NextResponse.json({ reports: rows.map((report: Record<string, unknown>) => {
      const post = (posts || []).find((item: {id:string}) => item.id === report.postId) || null;
      return {
        ...report,
        post: post ? { ...post, author: (authorRows || []).find((author: {id:string}) => author.id === post.authorId) || null } : null,
        community: (communities || []).find((item: {id:string}) => item.id === report.communityId) || null,
        reporter: (reporters || []).find((item: {id:string}) => item.id === report.reporterUserId) || null,
      };
    }) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "File de modération Community indisponible." }, { status: 500 });
  }
}
