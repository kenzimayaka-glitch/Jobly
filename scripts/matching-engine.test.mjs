import test from "node:test";
import assert from "node:assert/strict";
import { scoreJobMatch, scoreRecruiterApplication } from "../lib/matchingEngine.ts";

const strongCandidate = {
  headline: "Responsable commercial",
  summary: "Développement de portefeuille B2B et prospection grands comptes.",
  targetRoles: ["Commercial"],
  targetCities: ["Douala"],
  contractPreferences: ["CDI"],
  remotePreference: "NO",
  preferredSectors: ["Services"],
  skills: [
    { name: "Salesforce" },
    { name: "Prospection" },
    { name: "Négociation" },
    { name: "Excel" },
  ],
  experiences: [
    {
      title: "Responsable commercial",
      description: "Développement du portefeuille : 20 nouveaux comptes et croissance du chiffre d'affaires de 15%.",
      startDate: "2020-01-01",
      endDate: "2024-01-01",
    },
  ],
  education: [{ degree: "Licence", field: "Commerce et vente" }],
};

const strongJob = {
  title: "Sales Manager",
  description: "Minimum 3 ans d'expérience. Licence ou Bachelor requis. Pilotage des KPI commerciaux, prospection B2B et négociation.",
  location: "Douala",
  contractType: "CDI",
  remoteMode: "NO",
  minExperienceYears: 3,
  sector: "Services",
  tags: ["CRM", "Prospection", "Négociation"],
};

test("matches equivalent French/English job titles and demonstrated skills", () => {
  const result = scoreJobMatch(strongCandidate, strongJob);
  assert.ok(result.score >= 80, `expected strong match, received ${result.score}`);
  assert.equal(result.dimensions.role.score, 88);
  assert.deepEqual(result.missingSkills, []);
  assert.ok(result.confidence >= 70);
});

test("does not treat missing profile data as proven compatibility", () => {
  const result = scoreJobMatch({}, strongJob);
  assert.equal(result.score, 0);
  assert.equal(result.confidence, 0);
  assert.equal(result.dimensions.skills.score, null);
  assert.equal(result.dimensions.role.score, null);
});

test("uses overlapping employment periods once, not as additive years", () => {
  const result = scoreJobMatch({
    targetRoles: ["Commercial"],
    skills: ["Prospection"],
    experiences: [
      { title: "Commercial", startDate: "2020-01-01", endDate: "2023-01-01" },
      { title: "Business developer", startDate: "2021-01-01", endDate: "2024-01-01" },
    ],
  }, { title: "Commercial", minExperienceYears: 5, tags: ["Prospection"] });
  assert.ok(result.yearsExperience !== null && result.yearsExperience >= 3 && result.yearsExperience <= 4);
  assert.ok(result.dimensions.experience.score !== null && result.dimensions.experience.score < 100);
});

test("recruiter assessment uses weighted published criteria and structured profile evidence", () => {
  const result = scoreRecruiterApplication({
    candidate: strongCandidate,
    job: strongJob,
    criteria: [
      { criterion: "CRM", label: "Maîtrise CRM", weight: 3, required: true },
      { criterion: "Prospection", label: "Prospection", weight: 2, required: true },
      { criterion: "Doctorat en médecine", label: "Diplôme médical", weight: 1, required: false },
    ],
    cvProvided: true,
    verifiedDocumentKinds: ["DIPLOMA"],
  });
  assert.equal(result.matchedCriteria.length, 2);
  assert.equal(result.missingCriteria.length, 1);
  assert.ok(result.atsScore >= 70);
  assert.equal(result.profileCompleteness, 100);
  assert.deepEqual(result.missingDocuments, []);
});

test("keeps missing requirements visible instead of silently rejecting the candidate", () => {
  const result = scoreRecruiterApplication({
    candidate: strongCandidate,
    job: strongJob,
    criteria: [{ criterion: "Doctorat en médecine", weight: 1, required: true }],
  });
  assert.equal(result.missingCriteria.length, 1);
  assert.equal(result.missingCriteria[0].required, true);
  assert.equal(result.missingDocuments.length, 1);
});

test("uses the application CV text snapshot as evidence without requiring duplicate profile keywords", () => {
  const result = scoreJobMatch({
    headline: "Candidat",
    cvText: "Compétences : Salesforce, prospection commerciale et Microsoft Excel. Licence en commerce.",
  }, {
    title: "Commercial",
    description: "Prospection commerciale, maîtrise de Salesforce et Licence requise.",
    tags: ["Salesforce", "Prospection"],
  });
  assert.ok(result.matchedSkills.includes("Salesforce"));
  assert.ok(result.matchedSkills.includes("Prospection"));
  assert.equal(result.dimensions.education.score, 100);
});
