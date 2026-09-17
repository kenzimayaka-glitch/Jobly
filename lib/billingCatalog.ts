export type PlanCode = "FREE" | "START" | "PREMIUM" | "PRO";
export type BillingInterval = "MONTHLY" | "ANNUAL";

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPriceXaf: number;
  annualPriceXaf: number;
  aiCredits: number;
  storageMb: number;
  applicationsPerWeek: number;
  bulkApplicationLimit: number;
  cvVersions: number;
  savedJobs: number;
  alerts: number;
  atsConversionIncluded: boolean;
  atsConversionPriceXaf: number;
  cvDownloadPriceXaf: number;
  recruiterEmailConnect: number;
  recruiterAtsFilters: "none" | "limited" | "full" | "advanced";
  features: string[];
};

export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  FREE: {
    code: "FREE", name: "Free", tagline: "Découvrir et utiliser JOBLY manuellement.", monthlyPriceXaf: 0, annualPriceXaf: 0,
    aiCredits: 5, storageMb: 25, applicationsPerWeek: 15, bulkApplicationLimit: 1, cvVersions: 1, savedJobs: 20, alerts: 1,
    atsConversionIncluded: false, atsConversionPriceXaf: 500, cvDownloadPriceXaf: 500, recruiterEmailConnect: 0, recruiterAtsFilters: "none",
    features: ["Profil et CV", "Recherche illimitée", "15 candidatures / semaine", "Matching de base", "Mobility de base", "Career Brain limité", "Conversion CV → ATS : 500 FCFA", "Téléchargement CV : 500 FCFA"],
  },
  START: {
    code: "START", name: "Start", tagline: "Accélérer sa recherche.", monthlyPriceXaf: 1800, annualPriceXaf: 5000,
    aiCredits: 30, storageMb: 100, applicationsPerWeek: 30, bulkApplicationLimit: 1, cvVersions: 3, savedJobs: 100, alerts: 5,
    atsConversionIncluded: true, atsConversionPriceXaf: 0, cvDownloadPriceXaf: 500, recruiterEmailConnect: 0, recruiterAtsFilters: "limited",
    features: ["Tout Free", "30 candidatures / semaine", "Matching amélioré", "Analyse CV 10/mois", "Alertes personnalisées", "Career Brain amélioré", "Conversion CV → ATS incluse", "Téléchargement CV : 500 FCFA"],
  },
  PREMIUM: {
    code: "PREMIUM", name: "Premium", tagline: "JOBLY travaille avec moi.", monthlyPriceXaf: 3500, annualPriceXaf: 15500,
    aiCredits: 120, storageMb: 250, applicationsPerWeek: 100, bulkApplicationLimit: 10, cvVersions: Infinity, savedJobs: Infinity, alerts: 20,
    atsConversionIncluded: true, atsConversionPriceXaf: 0, cvDownloadPriceXaf: 0, recruiterEmailConnect: 1, recruiterAtsFilters: "full",
    features: ["Tout Start", "100 candidatures / semaine", "Multi-postulation jusqu'à 10 offres", "Matching avancé", "Optimisation CV", "Lettre de motivation", "Career Brain complet", "Préparation entretien", "Job Search Assistant", "Connexion boîte mail recruteur", "ATS & matching recruteur", "CV → ATS inclus", "Téléchargements CV inclus"],
  },
  PRO: {
    code: "PRO", name: "Pro", tagline: "JOBLY pilote activement ma stratégie de carrière.", monthlyPriceXaf: 5000, annualPriceXaf: 25800,
    aiCredits: 300, storageMb: 500, applicationsPerWeek: 200, bulkApplicationLimit: 10, cvVersions: Infinity, savedJobs: Infinity, alerts: Infinity,
    atsConversionIncluded: true, atsConversionPriceXaf: 0, cvDownloadPriceXaf: 0, recruiterEmailConnect: Infinity, recruiterAtsFilters: "advanced",
    features: ["Tout Premium", "200 candidatures / semaine", "Career Brain avancé", "Career Twin avancé", "Simulation entretien", "Adaptation avancée des candidatures", "Recherche priorisée", "Mobility avancée", "Automatisations recruteur avancées", "Support prioritaire", "Opérations CV incluses"],
  },
};

export type RecruiterPlanDefinition = {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPriceXaf: number;
  annualPriceXaf: number;
  aiCredits: number;
  features: string[];
};

/** Recruiter pricing is intentionally independent from the Talent catalog. */
export const RECRUITER_PLAN_CATALOG: Record<PlanCode, RecruiterPlanDefinition> = {
  FREE: { code: "FREE", name: "Free", tagline: "Recruter simplement sur JOBLY.", monthlyPriceXaf: 0, annualPriceXaf: 0, aiCredits: 5, features: ["Profil entreprise", "Publication et gestion de base", "Recherche Talent de base"] },
  START: { code: "START", name: "Start", tagline: "Structurer son recrutement.", monthlyPriceXaf: 15000, annualPriceXaf: 50000, aiCredits: 30, features: ["Tout Free", "Recherche Talent améliorée", "ATS de base", "Matching J’IA"] },
  PREMIUM: { code: "PREMIUM", name: "Premium", tagline: "Accélérer ses recrutements.", monthlyPriceXaf: 30000, annualPriceXaf: 80000, aiCredits: 120, features: ["Tout Start", "Talent Intelligence", "ATS avancé", "Matching avancé", "Gmail ATS", "Multiposting"] },
  PRO: { code: "PRO", name: "Pro", tagline: "Piloter son recrutement avec J’IA.", monthlyPriceXaf: 50000, annualPriceXaf: 100000, aiCredits: 300, features: ["Tout Premium", "J’IA recrutement avancée", "Automatisations", "Talent 360", "Recherche avancée", "Support prioritaire"] },
};

export const RECRUITER_BA_COMMISSION_RATES: Record<Exclude<PlanCode, "FREE">, number> = {
  START: 0.01,
  PREMIUM: 0.015,
  PRO: 0.02,
};

export const RECRUITER_BA_MONTHLY_BONUS = {
  amountXaf: 60000,
  targetPaidRecruiters: 80,
  mix: { START: 8, PREMIUM: 32, PRO: 40 },
};

export const BA_MONTHLY_CHAMPION_BONUS_XAF = 40000;

export const AI_CREDIT_COSTS: Record<string, number> = {
  ANALYSE_COURTE: 1, ANALYSE_OFFRE: 2, ANALYSE_CV: 3, OPTIMISATION_CV: 4, LETTRE: 2, PREPARATION_ENTRETIEN: 3, SIMULATION_ENTRETIEN: 5, ANALYSE_CAREER_TWIN: 3, PLAN_MOBILITY: 5, ADAPTATION_CANDIDATURE: 2, ANALYSE_APPROFONDIE: 5,
};

export function getPlan(code: string): PlanDefinition | null { return PLAN_CATALOG[code as PlanCode] ?? null; }
export function getPrice(code: PlanCode, interval: BillingInterval): number { const plan = PLAN_CATALOG[code]; return interval === "ANNUAL" ? plan.annualPriceXaf : plan.monthlyPriceXaf; }
export function getRecruiterPlan(code: string): RecruiterPlanDefinition | null { return RECRUITER_PLAN_CATALOG[code as PlanCode] ?? null; }
export function getRecruiterPrice(code: PlanCode, interval: BillingInterval): number { const plan = RECRUITER_PLAN_CATALOG[code]; return interval === "ANNUAL" ? plan.annualPriceXaf : plan.monthlyPriceXaf; }
export function getEntitlements(code: PlanCode) { const plan = PLAN_CATALOG[code]; return { plan: plan.code, name: plan.name, aiCredits: plan.aiCredits, storageMb: plan.storageMb, applicationsPerWeek: plan.applicationsPerWeek, bulkApplicationLimit: plan.bulkApplicationLimit, cvVersions: plan.cvVersions, savedJobs: plan.savedJobs, alerts: plan.alerts, atsConversionIncluded: plan.atsConversionIncluded, atsConversionPriceXaf: plan.atsConversionPriceXaf, cvDownloadPriceXaf: plan.cvDownloadPriceXaf, recruiterEmailConnect: plan.recruiterEmailConnect, recruiterAtsFilters: plan.recruiterAtsFilters, features: plan.features, premium: code !== "FREE" }; }
export function getRecruiterEntitlements(code: PlanCode) { const plan = RECRUITER_PLAN_CATALOG[code]; return { plan: plan.code, name: plan.name, aiCredits: plan.aiCredits, features: plan.features, premium: code !== "FREE" }; }
