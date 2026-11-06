export type AdminWorkspaceCode = "SUPPORT" | "FINANCE" | "MODERATOR" | "ANALYST";

export type AdminWorkspaceTemplate = {
  code: AdminWorkspaceCode;
  label: string;
  title: string;
  description: string;
  boundary: string;
  lanes: Array<{
    title: string;
    subtitle: string;
    cards: Array<{ title: string; description: string; href: string }>;
  }>;
};

export const ADMIN_WORKSPACE_TEMPLATES: AdminWorkspaceTemplate[] = [
  {
    code: "SUPPORT",
    label: "Support",
    title: "Support & accompagnement",
    description: "Outils de diagnostic et de reprise des parcours Jobly.",
    boundary: "Le dépôt ne contient pas encore de file de tickets utilisateurs centralisée. Cet espace relie les outils de support réellement disponibles sans afficher de faux dossiers.",
    lanes: [
      { title: "Dossiers opérationnels", subtitle: "Parcours et prestataires", cards: [
        {
          title: "Tickets & interventions",
          description: "Traiter les demandes, affecter un agent, répondre ou ajouter une note interne.",
          href: "/admin/support",
        },
        { title: "Mobility", description: "Consulter les prestataires, KYC, programmes, dossiers et preuves de transfert.", href: "/admin/mobility" },
      ]},
      { title: "Diagnostic", subtitle: "Flux et incidents d'offres", cards: [
        { title: "Réindexation des offres", description: "Relancer le traitement du pipeline d'offres et contrôler son résultat.", href: "/admin/jobs/reprocess" },
      ]},
      { title: "Escalade", subtitle: "Aide à l'analyse", cards: [
        { title: "J’IA Copilot", description: "Interroger l'intelligence interne pour préparer un diagnostic.", href: "/admin/jia/chat" },
      ]},
    ],
  },
  {
    code: "FINANCE",
    label: "Finance",
    title: "Finance & paiements",
    description: "Contrôle des encaissements, rapprochement Mobile Money et avantages commerciaux.",
    boundary: "Les validations restent soumises aux contrôles serveur existants. Cet espace ne déclenche aucun paiement sortant automatiquement.",
    lanes: [
      { title: "À vérifier", subtitle: "Pièces de paiement entrantes", cards: [
        { title: "Cockpit financier", description: "Suivre paiements, justificatifs, SMS, abonnements, commissions et fonds Mobility.", href: "/admin/finance" },
        { title: "Paiements événements", description: "Examiner les justificatifs et décider de leur validation.", href: "/admin/events/payments" },
      ]},
      { title: "Rapprochement", subtitle: "Configuration de réception", cards: [
        { title: "Mobile Money / SMS", description: "Configurer les comptes marchands et les appareils de réception.", href: "/admin/payments/sms" },
        { title: "Mobility", description: "Contrôler les engagements et preuves de décaissement documentées.", href: "/admin/mobility" },
      ]},
      { title: "Commercial", subtitle: "Entitlements et accès", cards: [
        { title: "Codes Pro", description: "Créer et suivre les codes d'accès sponsorisés.", href: "/admin/promo-codes" },
      ]},
    ],
  },
  {
    code: "MODERATOR",
    label: "Modération",
    title: "Modération & confiance",
    description: "Examiner les propositions Bon Plans en attente de décision.",
    boundary: "La file connectée est celle de BonPlan PENDING_REVIEW. La modération Community est actuellement automatisée par J’IA ; aucun panneau humain distinct n'est déclaré ici.",
    lanes: [
      { title: "À examiner", subtitle: "Propositions en attente", cards: [] },
      { title: "Outils de contrôle", subtitle: "Contrôle des flux", cards: [
        { title: "Signalements Community", description: "Examiner les signalements, masquer ou restaurer les publications et tracer les décisions.", href: "/admin/community" },
        { title: "Réindexation des offres", description: "Relancer et contrôler le traitement des offres agrégées.", href: "/admin/jobs/reprocess" },
      ]},
      { title: "Décisions", subtitle: "Historique de la session", cards: [] },
    ],
  },
  {
    code: "ANALYST",
    label: "Analyse",
    title: "Analyse & intelligence",
    description: "Cockpit CEO, signaux du marché et interprétation des données Jobly.",
    boundary: "Les indicateurs affichés proviennent des sources connectées au cockpit J’IA. Les couches sans données fiables ne doivent pas être interprétées comme des résultats nuls.",
    lanes: [
      { title: "Situation", subtitle: "Vue transversale", cards: [
        { title: "Reporting transversal", description: "Volumes exacts par domaine et disponibilité des sources Jobly.", href: "/admin/analytics" },
        { title: "CEO Intelligence", description: "Situation business, risques, opportunités, KPI et projections 7 / 30 / 90 jours.", href: "/admin/jia" },
      ]},
      { title: "Investigation", subtitle: "Analyse conversationnelle", cards: [
        { title: "CEO Copilot", description: "Questionner l'intelligence institutionnelle Jobly.", href: "/admin/jia/chat" },
      ]},
      { title: "Opérations", subtitle: "Éléments de contexte", cards: [
        { title: "Mobility", description: "Consulter l'état des programmes, financements et prestataires.", href: "/admin/mobility" },
      ]},
    ],
  },
];

export function getAdminWorkspaceTemplate(code: string) {
  return ADMIN_WORKSPACE_TEMPLATES.find((item) => item.code === code.toUpperCase()) || null;
}
