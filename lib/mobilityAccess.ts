type MobilityDb = { from: (table: string) => any };

function assertQuery(error: { message: string } | null | undefined, label: string) {
  if (error) throw new Error(label + ": " + error.message);
}

export function isInstitutionMobilityAdminRole(role: unknown): boolean {
  return String(role ?? "").trim().toUpperCase() === "INSTITUTION_ADMIN";
}

export async function getUserMobilityInstitutionIds(db: MobilityDb, userId: string): Promise<string[]> {
  const { data, error } = await db.from("InstitutionMember")
    .select("institutionId,role,active")
    .eq("userId", userId)
    .eq("active", true)
    .limit(1000);
  assertQuery(error, "MOBILITY_INSTITUTION_MEMBERSHIP_LOOKUP_FAILED");
  const ids = (data ?? [])
    .filter((row: { role: string; active: boolean }) => row.active && isInstitutionMobilityAdminRole(row.role))
    .map((row: { institutionId: string }) => String(row.institutionId))
    .filter(Boolean);
  return [...new Set<string>(ids)];
}

export async function getRecruiterMobilityRequestIds(db: MobilityDb, recruiterUserId: string): Promise<string[]> {
  const ids = new Set<string>();
  const direct = await db.from("MobilityRequest").select("id")
    .eq("recruiterUserId", recruiterUserId).limit(1000);
  assertQuery(direct.error, "MOBILITY_RECRUITER_REQUEST_LOOKUP_FAILED");
  for (const row of direct.data ?? []) if (row.id) ids.add(String(row.id));

  const agreements = await db.from("MobilityCompanyAgreement").select("id")
    .eq("recruiterUserId", recruiterUserId).limit(1000);
  assertQuery(agreements.error, "MOBILITY_RECRUITER_AGREEMENT_LOOKUP_FAILED");
  const agreementIds = (agreements.data ?? []).map((row: { id: string }) => row.id).filter(Boolean);
  if (agreementIds.length) {
    const linked = await db.from("MobilityRequest").select("id").in("companyAgreementId", agreementIds).limit(1000);
    assertQuery(linked.error, "MOBILITY_AGREEMENT_REQUEST_LOOKUP_FAILED");
    for (const row of linked.data ?? []) if (row.id) ids.add(String(row.id));
  }

  const jobs = await db.from("RecruiterJob").select("id").eq("recruiterUserId", recruiterUserId).limit(1000);
  assertQuery(jobs.error, "MOBILITY_RECRUITER_JOBS_LOOKUP_FAILED");
  const jobIds = (jobs.data ?? []).map((row: { id: string }) => row.id).filter(Boolean);
  if (jobIds.length) {
    const applications = await db.from("Application").select("id").in("recruiterJobId", jobIds).limit(1000);
    assertQuery(applications.error, "MOBILITY_RECRUITER_APPLICATIONS_LOOKUP_FAILED");
    const applicationIds = (applications.data ?? []).map((row: { id: string }) => row.id).filter(Boolean);
    if (applicationIds.length) {
      const linked = await db.from("MobilityRequest").select("id").in("applicationId", applicationIds).limit(1000);
      assertQuery(linked.error, "MOBILITY_APPLICATION_REQUEST_LOOKUP_FAILED");
      for (const row of linked.data ?? []) if (row.id) ids.add(String(row.id));
    }
  }
  return [...ids];
}

export async function getInstitutionMobilityRequestIds(db: MobilityDb, institutionId: string): Promise<string[]> {
  const programs = await db.from("MobilityProgram").select("id").eq("institutionId", institutionId).limit(1000);
  assertQuery(programs.error, "MOBILITY_INSTITUTION_PROGRAM_LOOKUP_FAILED");
  const programIds = (programs.data ?? []).map((row: { id: string }) => row.id).filter(Boolean);
  if (!programIds.length) return [];
  const allocations = await db.from("MobilityFundingAllocation")
    .select("mobilityRequestId")
    .in("programId", programIds)
    .limit(1000);
  assertQuery(allocations.error, "MOBILITY_INSTITUTION_ALLOCATION_LOOKUP_FAILED");
  return [...new Set<string>((allocations.data ?? [])
    .map((row: { mobilityRequestId: string }) => String(row.mobilityRequestId))
    .filter(Boolean))];
}

export async function getMobilityProviderRequestIds(db: MobilityDb, userId: string): Promise<string[]> {
  const { data: provider, error: providerError } = await db.from("MobilityServiceProvider")
    .select("id,status,kycStatus")
    .eq("userId", userId)
    .maybeSingle();
  assertQuery(providerError, "MOBILITY_PROVIDER_LOOKUP_FAILED");
  if (!provider || provider.status !== "ACTIVE" || provider.kycStatus !== "VERIFIED") return [];
  const { data, error } = await db.from("MobilityProviderAssignment")
    .select("mobilityRequestId")
    .eq("providerId", provider.id)
    .not("status", "in", '("DECLINED","CANCELLED")')
    .limit(1000);
  assertQuery(error, "MOBILITY_PROVIDER_ASSIGNMENT_LOOKUP_FAILED");
  return [...new Set<string>((data ?? [])
    .map((row: { mobilityRequestId: string }) => String(row.mobilityRequestId))
    .filter(Boolean))];
}

export async function institutionOwnsMobilityRequest(db: MobilityDb, institutionId: string, requestId: string): Promise<boolean> {
  return (await getInstitutionMobilityRequestIds(db, institutionId)).includes(requestId);
}

export function recruiterOwnsMobilityRequest(
  actorUserId: string,
  links: { requestRecruiterUserId?: string | null; agreementRecruiterUserId?: string | null; applicationRecruiterUserId?: string | null },
): boolean {
  if (!actorUserId) return false;
  return [links.requestRecruiterUserId, links.agreementRecruiterUserId, links.applicationRecruiterUserId]
    .some((linkedUserId) => Boolean(linkedUserId) && String(linkedUserId) === actorUserId);
}

export function mayGuaranteeMobilityRequest(
  actorRole: unknown,
  actorUserId: string,
  links: { requestRecruiterUserId?: string | null; agreementRecruiterUserId?: string | null; applicationRecruiterUserId?: string | null },
): boolean {
  const role = String(actorRole ?? "").trim().toUpperCase();
  if (role === "ADMIN") return true;
  return role === "RECRUITER" && recruiterOwnsMobilityRequest(actorUserId, links);
}
