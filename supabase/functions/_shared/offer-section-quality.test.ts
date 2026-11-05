import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sanitizeOfferSections } from "./offer-section-quality.ts";

Deno.test("moves trailing application instructions out of skills", () => {
  const result = sanitizeOfferSections({
    skills: [
      "Maîtrise de la suite Office et des outils CRM. Comment postuler Envoyez votre CV à recrutement@example.org.",
    ],
  });
  assertEquals(result.sections.skills, ["Maîtrise de la suite Office et des outils CRM."]);
  assertEquals(result.sections.application, ["Comment postuler Envoyez votre CV à recrutement@example.org."]);
  assertEquals(result.movedApplicationInstructions, 1);
});

Deno.test("moves a section made only of application instructions", () => {
  const result = sanitizeOfferSections({
    profile: ["Pour postuler, envoyer votre dossier de candidature à recrutement@example.org."],
  });
  assertEquals(result.sections.profile, []);
  assertEquals(result.sections.application.length, 1);
});

Deno.test("removes exact cross-section copies but preserves the first canonical copy", () => {
  const paragraph = "Assurer le suivi des clients et produire les rapports hebdomadaires.";
  const result = sanitizeOfferSections({
    description: [paragraph],
    missions: [paragraph],
    profile: [paragraph],
  });
  assertEquals(result.sections.description, [paragraph]);
  assertEquals(result.sections.missions, []);
  assertEquals(result.sections.profile, []);
  assertEquals(result.removedExactDuplicates, 2);
});

Deno.test("decodes numeric apostrophe entities before deduplication", () => {
  const result = sanitizeOfferSections({
    description: ["L&#039;entreprise recrute un agent."],
    missions: ["L'entreprise recrute un agent."],
  });
  assertEquals(result.sections.description, ["L'entreprise recrute un agent."]);
  assertEquals(result.sections.missions, []);
  assertEquals(result.removedExactDuplicates, 1);
});

Deno.test("does not move a plain email mention without application instructions", () => {
  const value = "Gérer la relation avec le fournisseur email de l'entreprise et mettre à jour les contacts.";
  const result = sanitizeOfferSections({ description: [value] });
  assertEquals(result.sections.description, [value]);
  assertEquals(result.sections.application, []);
  assertEquals(result.movedApplicationInstructions, 0);
});
