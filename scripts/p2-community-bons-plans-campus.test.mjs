import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Community detail sends the Supabase bearer session to API routes", () => {
  const page = read("app/communities/[id]/page.tsx");
  assert.match(page, /communityAuthHeaders/);
  assert.match(page, /Authorization: `Bearer/);
  assert.match(page, /headers: \{ \.\.\.headers, "Content-Type": "application\/json" \}/);
});

test("Both Community write routes share the moderation guard", () => {
  const nested = read("app/api/community/[id]/posts/route.ts");
  const central = read("app/api/community/posts/route.ts");
  const guard = read("lib/community/moderation.ts");
  assert.match(nested, /moderateCommunityMessage/);
  assert.match(central, /moderateCommunityMessage/);
  assert.match(guard, /inspectCommunityMessage/);
  assert.match(nested, /membership\.role === "BANNED"/);
  assert.match(central, /membership\.role === "BANNED"/);
});

test("Community membership cannot reactivate a banned member", () => {
  const route = read("app/api/community/[id]/membership/route.ts");
  assert.match(route, /existing\?\.role === "BANNED"/);
  assert.match(route, /community\.status !== "ACTIVE"/);
});

test("Bon Plans feed returns persisted interaction and comment counts", () => {
  const route = read("app/api/bon-plans/route.ts");
  assert.match(route, /from\("BonPlanInteraction"\)/);
  assert.match(route, /from\("BonPlanComment"\)/);
  assert.match(route, /viewerLiked/);
  assert.match(route, /viewerSaved/);
  assert.match(route, /likeCount/);
  assert.match(route, /commentCount/);
});

test("Bon Plans interactions reject unpublished, future and expired content", () => {
  const route = read("app/api/bon-plans/[id]/interactions/route.ts");
  assert.match(route, /plan\.status !== "PUBLISHED"/);
  assert.match(route, /plan\.startsAt && plan\.startsAt > now/);
  assert.match(route, /plan\.expiresAt && plan\.expiresAt <= now/);
});

test("Campus feed is authenticated and applies the canonical Jobly freshness rule", () => {
  const route = read("app/api/campus/opportunities/route.ts");
  const page = read("app/campus/page.tsx");
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /resolveEffectivePublicationDate/);
  assert.match(route, /JobHarvestCapture/);
  assert.match(page, /\/api\/campus\/opportunities/);
  assert.match(page, /Authorization: `Bearer/);
});

test("Community, Bons Plans and Campus translations exist in French and English", () => {
  const dict = read("lib/i18n/dictionary.ts");
  for (const key of [
    "community.page.title",
    "community.detail.join",
    "bonplans.page.emptyTitle",
    "bonplans.pillar.campusTitle",
    "campus.page.openOffer",
    "campus.page.institutionsTitle",
    "campus.page.institutionMembers",
  ]) {
    assert.ok(dict.includes(`"${key}":`), `missing FR/EN dictionary key: ${key}`);
    assert.equal((dict.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `key must exist once in each language: ${key}`);
  }
});

test("Bon Plans comments are real, authenticated on write and bounded", () => {
  const route = read("app/api/bon-plans/[id]/comments/route.ts");
  const page = read("app/bons-plans/page.tsx");
  assert.match(route, /from\("BonPlanComment"\)/);
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /content\.length > 1000/);
  assert.match(page, /\/comments/);
  assert.match(page, /commentOnPlan/);
  assert.match(page, /commentsByPlan/);
});

test("Community reactions and comments use persisted tables and real endpoints", () => {
  const reactions = read("app/api/community/[id]/posts/[postId]/reactions/route.ts");
  const comments = read("app/api/community/[id]/posts/[postId]/comments/route.ts");
  const page = read("app/communities/[id]/page.tsx");
  assert.match(reactions, /CommunityPostReaction/);
  assert.match(comments, /CommunityPostComment/);
  assert.match(page, /reactToPost/);
  assert.match(page, /commentOnPost/);
});

test("Campus institutional directory uses real active institutions and membership records", () => {
  const route = read("app/api/campus/institutions/route.ts");
  const page = read("app/campus/page.tsx");
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /from\("Institution"\)/);
  assert.match(route, /from\("InstitutionMember"\)/);
  assert.match(route, /\.eq\("active", true\)/);
  assert.match(route, /\\bdemo\\b/i);
  assert.match(route, /memberCount/);
  assert.match(page, /\/api\/campus\/institutions/);
  assert.match(page, /campus-institutions-title/);
  assert.match(page, /institutionCount/);
});
