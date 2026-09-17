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
  bulkApplicationLimit: number; // candidatures simultanées
  cvVersions: number; // Infinity = illimité
  savedJobs: number;
  alerts: number;
  atsConversionIncluded: boolean; // conversion CV -> ATS incluse dans l'abonnement
  atsConversionPriceXaf: number; // prix à l'unité si non incluse
  recruiterEmailConnect: number; // nb de boîtes mail connectables (0 = non dispo)
  recruiterAtsFilters: "none" | "limited" | "full" | "advanced";
  features: string[];
};

export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  FREE: {
    code: "FREE", name: "Free", tagline: "Découvrir et utiliser JOBLY manuellement.",
    monthlyPriceXaf: 0, annualPriceXaf: 0,
    aiCredits: 5, storageMb: 25,
    applicationsPerWeek: 15, bulkApplicationLimit: 1, cvVersions: 1,
    savedJobs: 20, alerts: 1,
    atsConversionIncluded: false, atsConversionPriceXaf: 1000,
    recruiterEmailConnect: 0, recruiterAtsFilters: "none",
    features: ["Profil et CV", "Recherche illimitée", "15 candidatures / semaine", "Matching de base", "Mobility de base", "Career Brain limité"],
  },
  START: {
    code: "START", name: "Start", tagline: "Accélérer sa recherche.",
    monthlyPriceXaf: 1800, annualPriceXaf: 5000,
    aiCredits: 30, storageMb: 100,
    applicationsPerWeek: 30, bulkApplicationLimit: 1, cvVersions: 3,
    savedJobs: 100, alerts: 5,
    atsConversionIncluded: false, atsConversionPriceXaf: 1000,
    recruiterEmailConnect: 0, recruiterAtsFilters: "limited",
    features: ["Tout Free", "30 candidatures / semaine", "Matching amélioré", "Analyse CV 10/mois", "Alertes personnalisées", "Career Brain amélioré"],
  },
  PREMIUM: {
    code: "PREMIUM", name: "Premium", tagline: "JOBLY travaille avec moi.",
    monthlyPriceXaf: 3500, annualPriceXaf: 15500,
    aiCredits: 120, storageMb: 250,
    applicationsPerWeek: 100, bulkApplicationLimit: 10, cvVersions: Infinity,
    savedJobs: Infinity, alerts: 20,
    atsConversionIncluded: true, atsConversionPriceXaf: 0,
    recruiterEmailConnect: 1, recruiterAtsFilters: "full",
    features: ["Tout Start", "100 candidatures / semaine", "Multi-postulation jusqu'à 10 offres", "Matching avancé", "Optimisation CV", "Lettre de motivation", "Career Brain complet", "Préparation entretien", "Job Search Assistant", "Connexion boîte mail recruteur", "ATS & matching recruteur", "CV → ATS inclus"],
  },
  PRO: {
    code: "PRO", name: "Pro", tagline: "JOBLY pilote activement ma stratégie de carrière.",
    monthlyPriceXaf: 5000, annualPriceXaf: 25800,
    aiCredits: 300, storageMb: 500,
    applicationsPerWeek: 200, bulkApplicationLimit: 10, cvVersions: Infinity,
    savedJobs: Infinity, alerts: Infinity,
    atsConversionIncluded: true, atsConversionPriceXaf: 0,
    recruiterEmailConnect: Infinity, recruiterAtsFilters: "advanced",
    features: ["Tout Premium", "200 candidatures / semaine", "Career Brain avancé", "Career Twin avancé", "Simulation entretien", "Adaptation avancée des candidatures", "Recherche priorisée", "Mobility avancée", "Automatisations recruteur avancées", "Support prioritaire"],
  },
};

// Coût en crédits IA par action (matrice interne, §7 de la note produit)
export const AI_CREDIT_COSTS: Record<string, number> = {
  ANALYSE_COURTE: 1,
  ANALYSE_OFFRE: 2,
  ANALYSE_CV: 3,
  OPTIMISATION_CV: 4,
  LETTRE: 2,
  PREPARATION_ENTRETIEN: 3,
  SIMULATION_ENTRETIEN: 5,
  ANALYSE_CAREER_TWIN: 3,
  PLAN_MOBILITY: 5,
  ADAPTATION_CANDIDATURE: 2,
  ANALYSE_APPROFONDIE: 5,
};

export function getPlan(code: string): PlanDefinition | null {
  return PLAN_CATALOG[code as PlanCode] ?? null;
}

export function getPrice(code: PlanCode, interval: BillingInterval): number {
  const plan = PLAN_CATALOG[code];
  return interval === "ANNUAL" ? plan.annualPriceXaf : plan.monthlyPriceXaf;
}

export function getEntitlements(code: PlanCode) {
  const plan = PLAN_CATALOG[code];
  return {
    plan: plan.code,
    name: plan.name,
    aiCredits: plan.aiCredits,
    storageMb: plan.storageMb,
    applicationsPerWeek: plan.applicationsPerWeek,
    bulkApplicationLimit: plan.bulkApplicationLimit,
    cvVersions: plan.cvVersions,
    savedJobs: plan.savedJobs,
    alerts: plan.alerts,
    atsConversionIncluded: plan.atsConversionIncluded,
    atsConversionPriceXaf: plan.atsConversionPriceXaf,
    recruiterEmailConnect: plan.recruiterEmailConnect,
    recruiterAtsFilters: plan.recruiterAtsFilters,
    features: plan.features,
    premium: code !== "FREE",
  };
}
