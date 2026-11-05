import { assertEquals } from "jsr:@std/assert@1";
import { resolveApplicationReadiness } from "./application-readiness.ts";
Deno.test("email or phone keeps a direct application route", () => {
  assertEquals(resolveApplicationReadiness({ email: "jobs@example.org" }).applicationAvailability, "DIRECT");
  assertEquals(resolveApplicationReadiness({ phone: "+237699000000" }).applicationReady, true);
});
Deno.test("a safe external application form is a direct route", () => {
  assertEquals(resolveApplicationReadiness({ applicationUrl: "https://employer.example.org/apply/123" }), {
    applicationReady: true, applicationAvailability: "DIRECT", applicationUrl: "https://employer.example.org/apply/123",
  });
});
Deno.test("a source-only offer remains displayable without pretending it is candidatable", () => {
  assertEquals(resolveApplicationReadiness({}).applicationReady, false);
  assertEquals(resolveApplicationReadiness({}).applicationAvailability, "SOURCE_ONLY");
});
Deno.test("unsafe application URL schemes are not accepted", () => {
  assertEquals(resolveApplicationReadiness({ applicationUrl: "javascript:alert(1)" }).applicationUrl, null);
  assertEquals(resolveApplicationReadiness({ applicationUrl: "data:text/html,apply" }).applicationReady, false);
});
