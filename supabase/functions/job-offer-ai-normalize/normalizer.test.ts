import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  buildGeminiBatchPrompt,
  normalizeGeminiOffer,
  parseGeminiOffers,
} from "./normalizer.ts";

Deno.test("Gemini prompt carries source identity and asks for adaptive presentation", () => {
  const prompt = buildGeminiBatchPrompt([{
    id: "job-1",
    title: "Responsable commercial",
    source: "Source A",
    sourceKey: "source_a",
    description: "Missions: vendre. Profil: expérience terrain.",
    normalizedContent: { displayModel: "jobly-source-source_a-v1" },
  }]);
  assertStringIncludes(prompt, "source_a");
  assertStringIncludes(prompt, "Ne force jamais toutes les offres");
  assertStringIncludes(prompt, "APPLICATION_FIRST");
});

Deno.test("Gemini output is parsed as a list", () => {
  const offers = parseGeminiOffers(JSON.stringify({ offers: [{ id: "job-1", confidence: "HIGH" }] }));
  assertEquals(offers.length, 1);
  assertEquals(offers[0].id, "job-1");
});

Deno.test("normalizer preserves source model and accepts a source-specific section order", () => {
  const normalized = normalizeGeminiOffer({
    title: "Responsable commercial",
    confidence: "HIGH",
    qualityScore: 88,
    sections: {
      missions: ["Développer le portefeuille clients."],
      requirements: ["Cinq années d'expérience."],
      application: ["Envoyer le CV par e-mail."],
    },
    presentation: {
      layout: "APPLICATION_FIRST",
      sourceLabel: "Annonce partenaire",
      sections: [
        { key: "missions", label: "Vos responsabilités", kind: "bullets" },
        { key: "requirements", label: "Conditions d'éligibilité", kind: "bullets" },
        { key: "application", label: "Comment candidater", kind: "steps" },
      ],
    },
  }, {
    id: "job-1",
    title: "Responsable commercial",
    source: "Source A",
    sourceKey: "source_a",
    sourceUrl: "https://example.org/job/1",
    description: "Annonce source originale.",
    normalizedContent: { displayModel: "jobly-source-source_a-v1", source: { name: "Source A" } },
  }, "gemini-2.5-flash", "2026-11-05T16:00:00.000Z");

  const presentation = normalized.presentation as Record<string, unknown>;
  const displaySections = presentation.sections as Array<Record<string, unknown>>;
  const sectionData = normalized.sections as Record<string, string[]>;
  assertEquals(presentation.layout, "APPLICATION_FIRST");
  assertEquals(presentation.sourceDisplayModel, "jobly-source-source_a-v1");
  assertEquals(displaySections[1].label, "Conditions d'éligibilité");
  assertEquals(sectionData.requirements[0], "Cinq années d'expérience.");
  assertEquals((normalized.aiClassification as Record<string, unknown>).provider, "GEMINI");
});

Deno.test("unknown AI section keys are excluded from the display contract", () => {
  const normalized = normalizeGeminiOffer({
    sections: { unknownSecretField: ["Do not render me."], description: ["Description."] },
    presentation: { sections: [{ key: "unknownSecretField", label: "Unknown" }, { key: "description", label: "Présentation" }] },
  }, {
    id: "job-2",
    title: "Assistant",
    sourceKey: "source_b",
    description: "Description.",
  }, "gemini-2.5-flash", "2026-11-05T16:00:00.000Z");

  const presentation = normalized.presentation as Record<string, unknown>;
  const displaySections = presentation.sections as Array<Record<string, unknown>>;
  assertEquals(displaySections.length, 1);
  assertEquals(displaySections[0].key, "description");
});
