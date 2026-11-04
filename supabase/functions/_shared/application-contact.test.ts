import { assertEquals } from "jsr:@std/assert@1";
import { extractApplicationContact, resolveSourceDisplayModel } from "./application-contact.ts";

Deno.test("extracts application email from instructions", () => {
  assertEquals(extractApplicationContact("Method of Application: Send CV to recrutement@example.org").email, "recrutement@example.org");
});
Deno.test("decodes Cloudflare protected application email", () => {
  const html = '<h3>Method of Application</h3><a href="/cdn-cgi/l/email-protection" data-cfemail="127362627e6b527c777e776a3c757d643c7c75">[email protected]</a>';
  assertEquals(extractApplicationContact(html).email, "apply@nelex.gov.ng");
});
Deno.test("extracts application email from recruiter contact block", () => {
  assertEquals(
    extractApplicationContact("Coordonnées du recruteur CANDIDATURES: envoyer votre CV à recrut.sn@secours-islamique.org").email,
    "recrut.sn@secours-islamique.org",
  );
});
Deno.test("extracts Cloudflare email from any tagged element", () => {
  const html = '<span class="__cf_email__" data-cfemail="127362627e6b527c777e776a3c757d643c7c75">[email protected]</span>';
  assertEquals(extractApplicationContact("Method of Application " + html).email, "apply@nelex.gov.ng");
});
Deno.test("extracts labelled international and local phone numbers", () => {
  assertEquals(extractApplicationContact("How to Apply: WhatsApp: +237 699 887 766").phone, "+237699887766");
  assertEquals(extractApplicationContact("Pour postuler: Téléphone: 070 123 4567").phone, "0701234567");
});
Deno.test("rejects salary fragments and company phones outside apply instructions", () => {
  assertEquals(extractApplicationContact("Method of Application: CV by email. Salary (NGN) 0 - 150000").phone, null);
  assertEquals(extractApplicationContact("About the Company Phone: +234 913-532-2942").phone, null);
  assertEquals(extractApplicationContact("Method of Application: Send CV. Company Phone: +00100000").phone, null);
});
Deno.test("does not treat URL or dates as contacts", () => {
  const text = "How to Apply: https://example.org/jobs; deadline 04/11/2026; published 02/11/2026";
  assertEquals(extractApplicationContact(text).email, null);
  assertEquals(extractApplicationContact(text).phone, null);
});
Deno.test("uses separate source-specific display model identifiers", () => {
  assertEquals(resolveSourceDisplayModel("nelex_ng", "institutional", "http"), "jobly-institutional-nelex_ng-v1");
  assertEquals(resolveSourceDisplayModel("anpe_bj", "institutional", "http"), "jobly-institutional-anpe_bj-v1");
});
