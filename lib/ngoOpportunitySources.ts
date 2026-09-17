export type NgoOpportunitySource = {
  id: string;
  name: string;
  url: string;
  scope: string;
  notes: string;
};

// Portails externes autorisés : JOBLY redirige vers la source originale et ne copie pas leur contenu.
export const NGO_OPPORTUNITY_SOURCES: NgoOpportunitySource[] = [
  { id: "reliefweb", name: "ReliefWeb", url: "https://reliefweb.int/jobs", scope: "Humanitaire / ONG / développement", notes: "Portail humanitaire des Nations Unies." },
  { id: "unjobs", name: "UNjobs", url: "https://unjobs.org/", scope: "ONU / ONG / organisations internationales", notes: "Agrégateur de postes ONU et organisations internationales." },
  { id: "impactpool", name: "Impactpool", url: "https://www.impactpool.org/jobs", scope: "ONU / ONG / développement international", notes: "Plateforme internationale de carrières à impact." },
  { id: "idealist", name: "Idealist", url: "https://www.idealist.org/en/jobs", scope: "Associatif / ONG / impact", notes: "Emplois et stages du secteur associatif et de l'impact." },
  { id: "devex", name: "Devex", url: "https://www.devex.com/jobs", scope: "Développement international", notes: "Emplois du développement international." },
  { id: "devnetjobs", name: "DevNetJobs", url: "https://www.devnetjobs.org/", scope: "ONG / développement", notes: "Emplois du développement international." },
  { id: "unjobs-cameroon", name: "UNjobs — Cameroun", url: "https://unjobs.org/duty_stations/cameroon", scope: "Cameroun", notes: "Filtre dédié aux opportunités au Cameroun." },
  { id: "un-careers", name: "UN Careers", url: "https://careers.un.org/", scope: "Nations Unies", notes: "Portail officiel de recrutement de l'ONU." },
  { id: "undp", name: "UNDP Careers", url: "https://www.undp.org/careers", scope: "Développement", notes: "Carrières officielles du PNUD." },
  { id: "unicef", name: "UNICEF Careers", url: "https://jobs.unicef.org/", scope: "Enfance / humanitaire / développement", notes: "Carrières officielles de l'UNICEF." },
];
