import fs from "node:fs/promises";
import { collectPublicJobSources } from "../lib/jobSourceCollector.ts";

const startedAt = new Date().toISOString();
const { offers, sources } = await collectPublicJobSources();

const bySource = Object.fromEntries(Object.entries(sources).map(([key, value]) => {
  const sourceOffers = offers.filter((o) => o.sourceKey === key);
  const normalized = sourceOffers.length;
  const countryResolved = sourceOffers.filter((o) => Boolean(o.location)).length;
  const languageResolved = sourceOffers.filter((o) => Boolean(o.description)).length;
  const fresh = sourceOffers.filter((o) => {
    const d = o.deadline || o.publishedAt;
    if (!d) return true;
    return new Date(d).getTime() >= Date.now() - 60 * 24 * 60 * 60 * 1000;
  }).length;
  const applicationReady = sourceOffers.filter((o) => {
    const p = o.applicationProfile || {};
    return p.channel === "EMAIL" || p.channel === "PHONE" || p.channel === "EXTERNAL";
  }).length;
  return [key, {
    discovered: value.discovered,
    errors: value.errors,
    normalized,
    countryResolved,
    languageResolved,
    fresh,
    applicationReady,
    publishable: Math.max(0, Math.min(fresh, applicationReady)),
    rejected: Math.max(0, normalized - Math.min(fresh, applicationReady))
  }];
}));

const report = {
  mode: "shadow",
  databaseModified: false,
  writes: 0,
  startedAt,
  finishedAt: new Date().toISOString(),
  totalOffers: offers.length,
  sources: bySource
};

await fs.mkdir("shadow-output", { recursive: true });
await fs.writeFile("shadow-output/africa-shadow-report.json", JSON.stringify(report, null, 2));
await fs.writeFile("shadow-output/africa-shadow-offers.json", JSON.stringify(
  offers.map(o => ({
    sourceKey: o.sourceKey,
    externalId: o.externalId,
    title: o.title,
    company: o.company,
    location: o.location,
    contractType: o.contractType,
    publishedAt: o.publishedAt,
    deadline: o.deadline,
    applicationChannel: o.applicationProfile?.channel ?? null,
    sourceUrl: o.sourceUrl
  })), null, 2
));

console.log(JSON.stringify(report, null, 2));
