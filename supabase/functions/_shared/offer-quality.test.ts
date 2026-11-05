import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveOfferQualityStatus } from "./offer-quality.ts";

Deno.test("complete source-only offer is quality OK without direct application contact", () => {
  assertEquals(
    deriveOfferQualityStatus({
      title: "Data Analyst",
      description: "Analyse des données, préparation de rapports et accompagnement des équipes métiers.",
      sourceUrl: "https://jobs.example.org/data-analyst",
    }),
    "ok",
  );
});

Deno.test("offer with short description requires content review", () => {
  assertEquals(
    deriveOfferQualityStatus({
      title: "Data Analyst",
      description: "Mission à préciser",
      sourceUrl: "https://jobs.example.org/data-analyst",
    }),
    "needs_review",
  );
});

Deno.test("HTML-only content does not pass the description threshold", () => {
  assertEquals(
    deriveOfferQualityStatus({
      title: "Data Analyst",
      description: "<div><p> </p><span></span></div>",
      sourceUrl: "https://jobs.example.org/data-analyst",
    }),
    "needs_review",
  );
});

Deno.test("offer without a source URL requires review", () => {
  assertEquals(
    deriveOfferQualityStatus({
      title: "Data Analyst",
      description: "Analyse des données, préparation de rapports et accompagnement des équipes métiers.",
      sourceUrl: "",
    }),
    "needs_review",
  );
});

Deno.test("offer with a non-HTTP source URL requires review", () => {
  assertEquals(
    deriveOfferQualityStatus({
      title: "Data Analyst",
      description: "Analyse des données, préparation de rapports et accompagnement des équipes métiers.",
      sourceUrl: "javascript:alert(1)",
    }),
    "needs_review",
  );
});

Deno.test("offer without a meaningful title requires review", () => {
  assertEquals(
    deriveOfferQualityStatus({
      title: "Job",
      description: "Analyse des données, préparation de rapports et accompagnement des équipes métiers.",
      sourceUrl: "https://jobs.example.org/data-analyst",
    }),
    "needs_review",
  );
});
