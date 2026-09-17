export type ExternalTrainingSource = {
  id: string;
  name: string;
  kind: "PUBLIC_API" | "AUTHENTICATED_API" | "CURATED_LINKS";
  enabled: boolean;
  notes: string;
};

/**
 * Sources intentionally kept explicit so JOBLY never scrapes an arbitrary site.
 * A source is enabled only when its API/feed and reuse terms are known.
 */
export const EXTERNAL_TRAINING_SOURCES: ExternalTrainingSource[] = [
  {
    id: "freecodecamp",
    name: "freeCodeCamp",
    kind: "PUBLIC_API",
    enabled: true,
    notes: "Curriculum metadata API; links point back to freeCodeCamp.",
  },
  {
    id: "microsoft-learn",
    name: "Microsoft Learn",
    kind: "AUTHENTICATED_API",
    enabled: Boolean(process.env.MICROSOFT_LEARN_API_TOKEN),
    notes: "Learn Platform API requires server-side authentication/onboarding; enable only after credentials are configured.",
  },
  {
    id: "jobly-course-recommendations",
    name: "JOBLY external course recommendations",
    kind: "CURATED_LINKS",
    enabled: true,
    notes: "Existing CourseRecommendation records store external course links without copying course content.",
  },
];
