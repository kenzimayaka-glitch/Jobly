export type ApplicationChannel = "JOBLY" | "EMAIL" | "EXTERNAL" | "UNSUPPORTED";

export type ApplicationChannelDefinition = {
  channel: ApplicationChannel;
  label: string;
  automated: boolean;
  requiresConnection: boolean;
  supportsProof: boolean;
  description: string;
};

export const APPLICATION_CHANNELS: Record<ApplicationChannel, ApplicationChannelDefinition> = {
  JOBLY: {
    channel: "JOBLY",
    label: "Candidature intégrée Jobly",
    automated: false,
    requiresConnection: false,
    supportsProof: true,
    description: "Réservé aux intégrations Jobly disposant d'un adaptateur de soumission vérifié.",
  },
  EMAIL: {
    channel: "EMAIL",
    label: "Email",
    automated: true,
    requiresConnection: true,
    supportsProof: true,
    description: "Envoi via la messagerie du candidat après connexion Gmail autorisée.",
  },
  EXTERNAL: {
    channel: "EXTERNAL",
    label: "Plateforme externe",
    automated: false,
    requiresConnection: false,
    supportsProof: false,
    description: "Ne doit pas être présenté comme candidature automatique sans adaptateur Jobly vérifié.",
  },
  UNSUPPORTED: {
    channel: "UNSUPPORTED",
    label: "Canal non vérifiable",
    automated: false,
    requiresConnection: false,
    supportsProof: false,
    description: "Aucun canal de candidature suffisamment fiable n'a été identifié.",
  },
};

const JOBLY_ADAPTERS = new Set<string>();

export function hasJoblyAdapter(adapterKey: string | null | undefined): boolean {
  return !!adapterKey && JOBLY_ADAPTERS.has(adapterKey);
}

export function getChannelDefinition(channel: ApplicationChannel): ApplicationChannelDefinition {
  return APPLICATION_CHANNELS[channel];
}
