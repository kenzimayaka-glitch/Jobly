import { assertEquals } from "jsr:@std/assert@1";
import { extractApplicationContact, resolveSourceDisplayModel } from "./application-contact.ts";

Deno.test("extracts application email from offer text", () => {
  assertEquals(extractApplicationContact("Send CV to recrutement@example.org").email, "recrutement@example.org");
});

Deno.test("extracts international and labelled local African phone numbers", () => {
  assertEquals(extractApplicationContact("WhatsApp: +237 699 887 766").phone, "+237699887766");
  assertEquals(extractApplicationContact("Téléphone: 070 123 4567").phone, "0701234567");
});

Deno.test("does not treat a plain apply URL or a date as an application contact", () => {
  assertEquals(extractApplicationContact("Apply at https://example.org/jobs; deadline 04/11/2026").email, null);
  assertEquals(extractApplicationContact("Published 04/11/2026; deadline 20/11/2026").phone, null);
});

Deno.test("assigns a distinct display model identifier by source", () => {
  assertEquals(
    resolveSourceDisplayModel("nelex_ng", "institutional", "http"),
    "jobly-institutional-nelex_ng-v1",
  );
  assertEquals(
    resolveSourceDisplayModel("anpe_bj", "institutional", "http"),
    "jobly-institutional-anpe_bj-v1",
  );
});
