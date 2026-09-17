import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: {
      id: "demo-company",
      name: "Jobly Demo",
      description: "Demo company for local development.",
      verified: true
    }
  });

  await prisma.job.upsert({
    where: { id: "demo-job" },
    update: {},
    create: {
      id: "demo-job",
      companyId: company.id,
      title: "Business Development Manager",
      description: "Manage business development activities, partnerships and sales pipeline. English required.",
      language: "en",
      location: "Yaoundé",
      contractType: "CDI",
      source: "JOBLY_SEED"
    }
  });

  console.log("Seed complete.");
}

main().finally(() => prisma.$disconnect());


const jobSources = [
  {
    name: "Doopinet / DooJobs",
    baseUrl: "https://doopin.net",
    searchUrl: "https://doopin.net",
    discoveryStatus: "VERIFIED",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Cameroon-focused job source. Integrate only through permitted feeds/APIs or link-out."
  },
  {
    name: "Cameroon Desk",
    baseUrl: "https://www.cameroondesks.com",
    searchUrl: "https://www.cameroondesks.com/search/label/jobs",
    discoveryStatus: "VERIFIED",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Jobs, internships and opportunities. Validate permissions before automated ingestion."
  },
  {
    name: "Minajobs",
    baseUrl: "https://cameroun.minajobs.net",
    searchUrl: "https://cameroun.minajobs.net/index",
    discoveryStatus: "VERIFIED",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Employment and internship platform."
  },
  {
    name: "I-CE",
    baseUrl: "https://i-ce.cm",
    searchUrl: "https://i-ce.cm",
    discoveryStatus: "USER_SUPPLIED_NEEDS_VERIFICATION",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Added from CTO handover request; automated ingestion must be verified."
  },
  {
    name: "Emploi.cm",
    baseUrl: "https://www.emploi.cm",
    searchUrl: "https://www.emploi.cm/recherche-jobs-cameroun",
    discoveryStatus: "VERIFIED",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Cameroon job board."
  },
  {
    name: "Louma Jobs",
    baseUrl: "https://louma-jobs.com",
    searchUrl: "https://louma-jobs.com/cameroun/emploi/",
    discoveryStatus: "VERIFIED",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Cameroon employment listings."
  },
  {
    name: "JobDeals",
    baseUrl: "https://jobdeals.com",
    searchUrl: "https://jobdeals.com",
    discoveryStatus: "USER_SUPPLIED_NEEDS_VERIFICATION",
    ingestionMode: "EXTERNAL_LINK",
    notes: "Added from CTO handover request; automated ingestion must be verified."
  }
];

async function seedJobSources(prisma: any) {
  for (const source of jobSources) {
    await prisma.jobSource.upsert({
      where: { name: source.name },
      update: source,
      create: source
    });
  }
}

export { jobSources, seedJobSources };
