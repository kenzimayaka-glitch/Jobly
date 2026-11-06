import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyJobSector } from "./job-sector-classification.ts";

Deno.test("classifies explicit role titles before incidental description terms", () => {
  assertEquals(
    classifyJobSector("Analyste financier", "Le poste collabore avec les équipes commerciales et informatiques."),
    "Finance & Accounting",
  );
});

Deno.test("classifies sales and marketing roles", () => {
  assertEquals(classifyJobSector("Responsable commercial", ""), "Sales & Marketing");
});

Deno.test("uses tags when the title is generic", () => {
  assertEquals(classifyJobSector("Assistant", "", ["data analyst", "Power BI"]), "Technology & Data");
});

Deno.test("uses accented and unaccented French role terms", () => {
  assertEquals(classifyJobSector("Médecin généraliste", ""), "Health & Social");
});

Deno.test("keeps unclassifiable roles in Other instead of guessing", () => {
  assertEquals(classifyJobSector("Opérateur polyvalent", "Description générale sans secteur identifiable."), "Other");
});
