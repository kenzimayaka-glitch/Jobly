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
    username: "jobly_e2e_talent",
    phone: "+237600000101",
    displayName: "Amina E2E Talent",
    headline: "Profil de test automatisé Jobly",
  },
  {
    key: "recruiter",
    email: "jobly-e2e-recruiter@jobly.test",
    role: "RECRUITER",
    firstName: "David",
    lastName: "E2E Recruiter",
    username: "jobly_e2e_recruiter",
    phone: "+237600000102",
    displayName: "David E2E Recruiter",
    companyName: "Jobly E2E Test Company",
  },
  {
    key: "partner",
    email: "jobly-e2e-partner@jobly.test",
    role: "PARTNER",
    firstName: "Mireille",
    lastName: "E2E Partner",
    username: "jobly_e2e_partner",
    phone: "+237600000103",
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
  authUserId: string,
) {
  const { data: byAuthId, error: byAuthIdError } = await admin
    .from("User")
    .select("id,authUserId,email,role")
    .eq("authUserId", authUserId)
    .maybeSingle();
  if (byAuthIdError) throw byAuthIdError;

  const { data: byEmail, error: byEmailError } = await admin
    .from("User")
    .select("id,authUserId,email,role")
    .eq("email", fixture.email)
    .maybeSingle();
  if (byEmailError) throw byEmailError;

  if (byAuthId && byEmail && byAuthId.id !== byEmail.id) {
    throw new Error("E2E_FIXTURE_USER_LINK_CONFLICT:" + fixture.key);
  }
  const existing = byAuthId ?? byEmail;
  if (existing && (
    (existing.authUserId && existing.authUserId !== authUserId) ||
    existing.email?.toLowerCase() !== fixture.email ||
    existing.role !== fixture.role
  )) {
    throw new Error("E2E_FIXTURE_PUBLIC_USER_CONFLICT:" + fixture.key);
  }

  // Jobly keeps a distinct internal User.id. authUserId is the Supabase Auth UID.
  const internalUserId = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const userRow = {
    id: internalUserId,
    authUserId,
    email: fixture.email,
    phone: fixture.phone,
    role: fixture.role,
    displayName: fixture.displayName,
    username: fixture.username,
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    country: "CM",
    privacyAcceptedAt: now,
    aiWelcomeCredits: fixture.role === "TALENT" ? 30 : 0,
    aiWelcomeGrantedAt: fixture.role === "TALENT" ? now : null,
    updatedAt: now,
  };
  if (existing) {
    const { error } = await admin.from("User").update(userRow).eq("id", internalUserId);
    if (error) throw error;
  } else {
    const { error } = await admin.from("User").insert(userRow);
    if (error) throw error;
  }

  if (fixture.role === "TALENT") {
    const { data: existingProfile, error: profileLookupError } = await admin
      .from("Profile")
      .select("id")
      .eq("userId", internalUserId)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;
    const profileRow = {
      userId: internalUserId,
      firstName: fixture.firstName,
      lastName: fixture.lastName,
      phone: fixture.phone,
      country: "CM",
      headline: fixture.headline,
      targetRoles: ["Product Manager", "Business Analyst"],
      preferredSectors: ["Technology", "Services"],
      targetCities: ["Yaoundé", "Douala"],
      contractPreferences: ["CDI", "CDD", "Stage"],
      remotePreference: "INDIFFERENT",
      publicDiscoverable: false,
    };
    const profileWrite = existingProfile
      ? await admin.from("Profile").update(profileRow).eq("id", existingProfile.id)
      : await admin.from("Profile").insert({ id: crypto.randomUUID(), ...profileRow });
    if (profileWrite.error) throw profileWrite.error;
  }

  if (fixture.role === "RECRUITER") {
    // RecruiterProfile is intentionally keyed by the Supabase Auth UID, not User.id.
    const { data: existingRecruiterProfile, error: recruiterLookupError } = await admin
      .from("RecruiterProfile")
      .select("id")
      .eq("userId", authUserId)
      .maybeSingle();
    if (recruiterLookupError) throw recruiterLookupError;
    const recruiterRow = {
      userId: authUserId,
      companyName: fixture.companyName,
      sector: "Technology",
      website: "https://jobly-e2e.test",
      location: "Yaoundé, Cameroon",
      verified: false,
      updatedAt: now,
    };
    const recruiterWrite = existingRecruiterProfile
      ? await admin.from("RecruiterProfile").update(recruiterRow).eq("id", existingRecruiterProfile.id)
      : await admin.from("RecruiterProfile").insert({ id: crypto.randomUUID(), ...recruiterRow });
    if (recruiterWrite.error) throw recruiterWrite.error;
  }

  if (fixture.role === "PARTNER") {
    const { data: existingPartner, error: partnerLookupError } = await admin
      .from("Partner")
      .select("id")
      .eq("userId", internalUserId)
      .maybeSingle();
    if (partnerLookupError) throw partnerLookupError;
    const partnerRow = {
      userId: internalUserId,
      referralCode: "E2E-" + internalUserId.replaceAll("-", "").slice(0, 12).toUpperCase(),
      partnerType: "BRAND_AMBASSADOR",
      kycStatus: "PENDING",
      locationText: "Yaoundé, Cameroon",
      locationConsent: false,
    };
    const partnerWrite = existingPartner
      ? await admin.from("Partner").update(partnerRow).eq("id", existingPartner.id)
      : await admin.from("Partner").insert({ id: crypto.randomUUID(), ...partnerRow });
    if (partnerWrite.error) throw partnerWrite.error;
  }

  return internalUserId;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (new URL(projectUrl).hostname !== PROJECT_REF + ".supabase.co") {
    return json({ error: "E2E_PROJECT_GUARD_REJECTED" }, 403);
  }

  const publishableKey = readPublishableKey();
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!publishableKey || !token) {
    return json({ error: "AUTHENTICATED_E2E_ADMIN_SESSION_REQUIRED" }, 401);
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
    const userClient = createClient(PROJECT_URL, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "E2E_ADMIN_SESSION_INVALID" }, 401);
    }

    const { data: applicationUser, error: applicationUserError } = await admin
      .from("User")
      .select("id,authUserId,role")
      .eq("authUserId", authData.user.id)
      .eq("role", "ADMIN")
      .maybeSingle();
    if (applicationUserError) throw applicationUserError;
    if (!applicationUser) {
      return json({ error: "E2E_ADMIN_ROLE_REQUIRED" }, 403);
    }

    const { data: adminIdentity, error: adminIdentityError } = await admin
      .from("AdminIdentity")
      .select("id,active")
      .eq("authUserId", authData.user.id)
      .eq("active", true)
      .maybeSingle();
    if (adminIdentityError) throw adminIdentityError;
    if (!adminIdentity) {
      return json({ error: "ACTIVE_E2E_ADMIN_IDENTITY_REQUIRED" }, 403);
    }

    const identityHash = await sha256("e2e-fixture-provision:" + authData.user.id);
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
        const internalUserId = await upsertApplicationIdentity(admin, fixture, identity.userId);
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
        userId: internalUserId,
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
