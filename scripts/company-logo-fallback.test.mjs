import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyLogoFallbackSvg, getCompanyLogoInitials } from "../lib/companyLogoFallback.ts";

test("company logo initials use the first hostname label", () => {
  assert.equal(getCompanyLogoInitials("naxa.cm"), "NA");
  assert.equal(getCompanyLogoInitials("company.example.com"), "CO");
  assert.equal(getCompanyLogoInitials("x.org"), "X");
});

test("company logo initials fall back when the domain has no alphanumeric label", () => {
  assert.equal(getCompanyLogoInitials("..."), "CO");
  assert.equal(getCompanyLogoInitials(""), "CO");
});

test("fallback SVG is deterministic and contains only sanitized initials", () => {
  const svg = buildCompanyLogoFallbackSvg('"><script>alert(1)</script>.example');
  assert.match(svg, /<svg\b/);
  assert.match(svg, />SC<\/text>/);
  assert.doesNotMatch(svg, /<script|onerror|javascript:/i);
  assert.equal(svg, buildCompanyLogoFallbackSvg('"><script>alert(1)</script>.example'));
});
