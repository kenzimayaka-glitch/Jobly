import test from "node:test";
import assert from "node:assert/strict";

import {
  isProfilePhotoPublic,
  getProfilePhotoStoragePath,
  resolveOwnProfilePhotoUrls,
  PRIVATE_PROFILE_PHOTO_BUCKET,
  PUBLIC_PROFILE_PHOTO_BUCKET,
} from "../../lib/profilePhotoStorage.ts";
import {
  exposePublishedEventMedia,
  eventStoragePathFromPublicUrl,
  JOBLY_EVENTS_BUCKET,
} from "../../lib/eventStorage.ts";

test("profile photo visibility is private unless PUBLIC consent has a timestamp", () => {
  assert.equal(isProfilePhotoPublic(null), false);
  assert.equal(isProfilePhotoPublic(undefined), false);
  assert.equal(isProfilePhotoPublic({ profilePhotoVisibility: "PRIVATE", profilePhotoConsentAt: "2026-11-08T10:00:00Z" }), false);
  assert.equal(isProfilePhotoPublic({ profilePhotoVisibility: "PUBLIC", profilePhotoConsentAt: null }), false);
  assert.equal(isProfilePhotoPublic({ profilePhotoVisibility: "PUBLIC", profilePhotoConsentAt: "" }), false);
  assert.equal(isProfilePhotoPublic({ profilePhotoVisibility: "PUBLIC", profilePhotoConsentAt: "2026-11-08T10:00:00Z" }), true);
});

test("photo storage paths reject traversal and parse only the canonical public bucket URL", () => {
  assert.equal(getProfilePhotoStoragePath({ profilePhotoStoragePath: "user-1/avatar.png" }), "user-1/avatar.png");
  assert.equal(getProfilePhotoStoragePath({ profilePhotoStoragePath: "../private.png" }), null);
  assert.equal(
    getProfilePhotoStoragePath({ profilePhotoUrl: "https://example.supabase.co/storage/v1/object/public/profile-photos/user%2Favatar.png?x=1" }),
    "user/avatar.png",
  );
  assert.equal(
    getProfilePhotoStoragePath({ profilePhotoUrl: "https://example.supabase.co/storage/v1/object/public/other-bucket/user/avatar.png" }),
    null,
  );
});

test("owner receives signed photo URLs by default and no public URL is minted", async () => {
  const calls = [];
  const supabase = {
    storage: {
      from(bucket) {
        calls.push({ method: "from", bucket });
        return {
          async createSignedUrl(path, expiresIn) {
            calls.push({ method: "signed", bucket, path, expiresIn });
            return { data: { signedUrl: "signed://" + bucket + "/" + path }, error: null };
          },
          getPublicUrl(path) {
            calls.push({ method: "public", bucket, path });
            return { data: { publicUrl: "public://" + bucket + "/" + path } };
          },
        };
      },
    },
  };

  const result = await resolveOwnProfilePhotoUrls(supabase, {
    id: "talent-1",
    profilePhotoStoragePath: "talent-1/avatar.png",
  });

  assert.equal(result.profilePhotoVisibility, "PRIVATE");
  assert.equal(result.profilePhotoUrl, "signed://" + PRIVATE_PROFILE_PHOTO_BUCKET + "/talent-1/avatar.png");
  assert.equal(result.heroPhotoUrl, "signed://" + PRIVATE_PROFILE_PHOTO_BUCKET + "/talent-1/avatar.png.hero.png");
  assert.equal(calls.some((call) => call.method === "public"), false);
  assert.equal(calls.filter((call) => call.method === "signed").length, 2);
  assert.ok(calls.every((call) => call.bucket === PRIVATE_PROFILE_PHOTO_BUCKET));
});

test("public photo URLs are generated only after recorded explicit consent", async () => {
  const calls = [];
  const supabase = {
    storage: {
      from(bucket) {
        calls.push({ method: "from", bucket });
        return {
          async createSignedUrl(path, expiresIn) {
            calls.push({ method: "signed", bucket, path, expiresIn });
            return { data: { signedUrl: "signed://" + path }, error: null };
          },
          getPublicUrl(path) {
            calls.push({ method: "public", bucket, path });
            return { data: { publicUrl: "public://" + path } };
          },
        };
      },
    },
  };

  const result = await resolveOwnProfilePhotoUrls(supabase, {
    id: "talent-2",
    profilePhotoStoragePath: "talent-2/avatar.png",
    profilePhotoVisibility: "PUBLIC",
    profilePhotoConsentAt: "2026-11-08T10:00:00Z",
  });

  assert.equal(result.profilePhotoVisibility, "PUBLIC");
  assert.equal(result.profilePhotoUrl, "public://talent-2/avatar.png");
  assert.equal(result.heroPhotoUrl, "public://talent-2/avatar.png.hero.png");
  assert.ok(calls.every((call) => call.bucket === PUBLIC_PROFILE_PHOTO_BUCKET));
  assert.equal(calls.some((call) => call.method === "signed"), false);
});

test("published event media resolver signs only a private bucket object and strips its storage path", async () => {
  const calls = [];
  const supabase = {
    storage: {
      from(bucket) {
        calls.push({ method: "from", bucket });
        return {
          async createSignedUrl(path, expiresIn) {
            calls.push({ method: "signed", bucket, path, expiresIn });
            return { data: { signedUrl: "signed://" + bucket + "/" + path }, error: null };
          },
        };
      },
    },
  };
  const event = {
    id: "event-1",
    title: "Forum E2E",
    status: "PUBLISHED",
    mediaUrl: null,
    mediaStoragePath: "owner-1/00000000-0000-4000-8000-000000000001.mp4",
  };

  const result = await exposePublishedEventMedia(supabase, event);

  assert.equal(calls[0].bucket, JOBLY_EVENTS_BUCKET);
  assert.deepEqual(calls[1], {
    method: "signed",
    bucket: JOBLY_EVENTS_BUCKET,
    path: event.mediaStoragePath,
    expiresIn: 60 * 60 * 24 * 7,
  });
  assert.equal(result.mediaUrl, "signed://jobly-events/" + event.mediaStoragePath);
  assert.equal("mediaStoragePath" in result, false);
});

test("legacy event public URL parser accepts only the canonical event bucket", () => {
  assert.equal(
    eventStoragePathFromPublicUrl("https://example.supabase.co/storage/v1/object/public/jobly-events/event/video.mp4"),
    "event/video.mp4",
  );
  assert.equal(
    eventStoragePathFromPublicUrl("https://example.supabase.co/storage/v1/object/public/other-bucket/event/video.mp4"),
    null,
  );
  assert.equal(
    eventStoragePathFromPublicUrl("https://example.supabase.co/storage/v1/object/public/jobly-events/../secret.mp4"),
    null,
  );
});


import { verifyPrivateStorageAccess, PRIVATE_STORAGE_SMOKE_TARGETS } from "./lot00-storage-access-smoke.mjs";

test("real Storage access smoke checks every private bucket and always removes its temporary object", async () => {
  const objects = new Map();
  const requests = [];
  const admin = {
    storage: {
      from(bucket) {
        return {
          async upload(path, bytes, options) {
            objects.set(bucket + "/" + path, { bytes, options });
            requests.push({ method: "upload", bucket });
            return { error: null };
          },
          async createSignedUrl(path) {
            requests.push({ method: "signed-url", bucket });
            return { data: { signedUrl: "https://signed.invalid/" + bucket + "/" + path + "?token=not-logged" }, error: null };
          },
          async remove(paths) {
            for (const path of paths) objects.delete(bucket + "/" + path);
            requests.push({ method: "remove", bucket });
            return { error: null };
          },
        };
      },
    },
  };
  const fetchImpl = async (url) => String(url).startsWith("https://signed.invalid/")
    ? { ok: true, status: 200 }
    : { ok: false, status: 404 };

  const results = await verifyPrivateStorageAccess({
    admin,
    supabaseUrl: "https://ofqqrryamslxoqkklraw.supabase.co",
    anonKey: "sb_publishable_e2e_test",
    fetchImpl,
  });

  assert.equal(results.length, PRIVATE_STORAGE_SMOKE_TARGETS.length);
  assert.equal(results.every((x) => x.status === "PASS" && x.upload === "PASS" && x.signedRead === "PASS" && x.anonymousPublicRead === "DENIED" && x.cleanup === "PASS"), true);
  assert.equal(objects.size, 0);
  assert.equal(requests.filter((x) => x.method === "upload").length, 5);
  assert.equal(requests.filter((x) => x.method === "remove").length, 5);
});

test("private Storage smoke refuses anonymous readability and still cleans the test object", async () => {
  const objects = new Set();
  const admin = {
    storage: {
      from(bucket) {
        return {
          async upload(path) { objects.add(bucket + "/" + path); return { error: null }; },
          async createSignedUrl(path) { return { data: { signedUrl: "https://signed.invalid/" + path }, error: null }; },
          async remove(paths) { for (const path of paths) objects.delete(bucket + "/" + path); return { error: null }; },
        };
      },
    },
  };
  const fetchImpl = async (url) => String(url).startsWith("https://signed.invalid/")
    ? { ok: true, status: 200 }
    : { ok: true, status: 200 };

  await assert.rejects(
    () => verifyPrivateStorageAccess({
      admin,
      supabaseUrl: "https://ofqqrryamslxoqkklraw.supabase.co",
      anonKey: "sb_publishable_e2e_test",
      fetchImpl,
    }),
    /Storage access smoke failed/,
  );
  assert.equal(objects.size, 0);
});
