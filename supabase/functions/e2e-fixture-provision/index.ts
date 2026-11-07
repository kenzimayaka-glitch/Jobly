import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const PROJECT_URL = "https://" + PROJECT_REF + ".supabase.co";
const FIXTURES = [
  {
    key: "talent",
    email: "jobly-e2e-talent@jobly.test",
    role: "TALENT",
    firstName: "Amina",
    lastName: "E2E Talent",
    displayName: "Amina E2E Talent",
    headline: "Profil de test automatisé Jobly",
  },
  {
    key: "recruiter",
    email: "jobly-e2e-recruiter@jobly.test",
    role: "RECRUITER",
    firstName: "David",
    lastName: "E2E Recruiter",
    displayName: "David E2E Recruiter",
    companyName: "Jobly E2E Test Company",
  },
  {
    key: "partner",
    email: "jobly-e2e-partner@jobly.test",
    role: "PARTNER",
    firstName: "Mireille",
    lastName: "E2E Partner",
    displayName: "Mireille E2E Partner",
  },
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-e2e-run-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function newPassword() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "JlyE2E!" + hex(bytes) + "aA9";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return hex(new Uint8Array(digest));
}

function readPublishableKey() {
  const value = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed.default === "string") return parsed.default;
    } catch {
      // Fall through to the legacy anon key.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function makeAdminClient() {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey) throw new Error("E2E_ADMIN_KEY_UNAVAILABLE");
  return createClient(PROJECT_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function getOrCreateAuthUser(
  admin: ReturnType<typeof makeAdminClient>,
  fixture: typeof FIXTURES[number],
  password: string,
) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const existing = listed.users.find((user) => user.email?.toLowerCase() === fixture.email);
  let userId: string;
  let created = false;

  if (existing) {
    if (
      existing.app_metadata?.e2e_fixture !== true ||
      existing.app_metadata?.e2e_role !== fixture.role
    ) {
      throw new Error("E2E_FIXTURE_EMAIL_OWNED_BY_NON_FIXTURE_USER:" + fixture.email);
    }
    userId = existing.id;
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      app_metadata: {
        ...existing.app_metadata,
        e2e_fixture: true,
        e2e_role: fixture.role,
      },
      user_metadata: {
        ...existing.user_metadata,
        first_name: fixture.firstName,
        last_name: fixture.lastName,
        full_name: fixture.displayName,
        e2e_fixture: true,
      },
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("E2E_FIXTURE_PASSWORD_ROTATION_FAILED");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: fixture.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: fixture.firstName,
        last_name: fixture.lastName,
        full_name: fixture.displayName,
        e2e_fixture: true,
      },
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("E2E_FIXTURE_AUTH_CREATE_FAILED");
    userId = data.user.id;
    created = true;

    const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { e2e_fixture: true, e2e_role: fixture.role },
    });
    if (metadataError) {
      await admin.auth.admin.deleteUser(userId);
      throw metadataError;
    }
  }

  return { userId, created };
}

async function upsertApplicationIdentity(
  admin: ReturnType<typeof makeAdminClient>,
  fixture: typeof FIXTURES[number],
  userId: string,
) {
  const { data: byId, error: byIdError } = await admin
    .from("User")
    .select("id,authUserId,email,role")
    .eq("id", userId)
    .maybeSingle();
  if (byIdError) throw byIdError;

  const { data: byEmail, error: byEmailError } = await admin
    .from("User")
    .select("id,authUserId,email,role")
    .eq("email", fixture.email)
    .maybeSingle();
  if (byEmailError) throw byEmailError;

  const existing = byId ?? byEmail;
  if (existing && (
    existing.id !== userId ||
    existing.authUserId !== userId ||
    existing.email?.toLowerCase() !== fixture.email ||
    existing.role !== fixture.role
  )) {
    throw new Error("E2E_FIXTURE_PUBLIC_USER_CONFLICT:" + fixture.key);
  }

  const userRow = {
    id: userId,
    authUserId: userId,
    email: fixture.email,
    role: fixture.role,
    displayName: fixture.displayName,
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    country: "Cameroon",
  };
  const { error: userError } = await admin.from("User").upsert(userRow, { onConflict: "id" });
  if (userError) throw userError;

  if (fixture.role === "TALENT") {
    const { error } = await admin.from("Profile").upsert({
      id: userId,
      userId,
      firstName: fixture.firstName,
      lastName: fixture.lastName,
      country: "Cameroon",
      headline: fixture.headline,
      targetRoles: ["Product Manager", "Business Analyst"],
      preferredSectors: ["Technology", "Services"],
      targetCities: ["Yaoundé", "Douala"],
      contractPreferences: ["CDI", "CDD", "Stage"],
      remotePreference: "INDIFFERENT",
      publicDiscoverable: false,
    }, { onConflict: "userId" });
    if (error) throw error;
  }

  if (fixture.role === "RECRUITER") {
    const { error } = await admin.from("RecruiterProfile").upsert({
      userId,
      companyName: fixture.companyName,
      sector: "Technology",
      website: "https://jobly-e2e.test",
      location: "Yaoundé, Cameroon",
      verified: false,
    }, { onConflict: "userId" });
    if (error) throw error;
  }

  if (fixture.role === "PARTNER") {
    const { error } = await admin.from("Partner").upsert({
      userId,
      referralCode: "E2E-" + userId.replaceAll("-", "").slice(0, 12).toUpperCase(),
      partnerType: "BRAND_AMBASSADOR",
      kycStatus: "PENDING",
      locationText: "Yaoundé, Cameroon",
      locationConsent: false,
    }, { onConflict: "userId" });
    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (new URL(projectUrl).hostname !== PROJECT_REF + ".supabase.co") {
    return json({ error: "E2E_PROJECT_GUARD_REJECTED" }, 403);
  }

  const publishableKey = readPublishableKey();
  if (!publishableKey || req.headers.get("apikey") !== publishableKey) {
    return json({ error: "E2E_PUBLISHABLE_KEY_REQUIRED" }, 401);
  }

  const runId = req.headers.get("x-e2e-run-id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
    return json({ error: "VALID_E2E_RUN_ID_REQUIRED" }, 400);
  }

  let admin: ReturnType<typeof makeAdminClient>;
  try {
    admin = makeAdminClient();
  } catch {
    return json({ error: "E2E_ADMIN_KEY_UNAVAILABLE" }, 503);
  }

  try {
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const identityHash = await sha256("e2e-fixture-provision:" + forwardedFor);
    const { data: rateLimit, error: rateLimitError } = await admin.rpc("consume_api_rate_limit", {
      p_scope: "e2e-fixture-provision",
      p_identity_hash: identityHash,
      p_window_seconds: 60,
      p_max_requests: 2,
    });
    if (rateLimitError) throw rateLimitError;
    if (!rateLimit?.[0]?.allowed) {
      return json({
        error: "E2E_FIXTURE_RATE_LIMITED",
        retryAfterSeconds: rateLimit?.[0]?.retry_after_seconds ?? 60,
      }, 429);
    }

    const accounts = [];
    for (const fixture of FIXTURES) {
      const password = newPassword();
      const identity = await getOrCreateAuthUser(admin, fixture, password);
      try {
        await upsertApplicationIdentity(admin, fixture, identity.userId);
      } catch (error) {
        if (identity.created) {
          await admin.auth.admin.deleteUser(identity.userId);
        }
        throw error;
      }
      accounts.push({
        key: fixture.key,
        role: fixture.role,
        email: fixture.email,
        password,
        authUserId: identity.userId,
      });
    }

    return json({
      status: "PASS",
      environment: "JOBLY-E2E",
      projectRef: PROJECT_REF,
      runId,
      accounts,
      safeguards: {
        createdOrUpdatedRoles: ["TALENT", "RECRUITER", "PARTNER"],
        adminAccountModified: false,
        emailSent: false,
        smsSent: false,
        productionTouched: false,
      },
    });
  } catch (error) {
    console.error("e2e-fixture-provision failed", error instanceof Error ? error.message : String(error));
    return json({
      error: "E2E_FIXTURE_PROVISION_FAILED",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
