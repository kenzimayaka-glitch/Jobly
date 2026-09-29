import assert from "node:assert/strict";
import { buildCanonicalOffer } from "../lib/jobCanonicalOffer";

function html(title: string, body: string): string {
  return `<!doctype html><html><head><title>${title}</title></head><body>
  <header><nav>Accueil Poster une offre Contact</nav></header>
  <main><article><h1>${title}</h1>${body}</article></main>
  <footer>Copyright Contactez-nous</footer></body></html>`;
}

function check(name: string, input: Parameters<typeof buildCanonicalOffer>[0], expected: Record<string, unknown>) {
  const { canonical } = buildCanonicalOffer(input);
  for (const [field, value] of Object.entries(expected)) {
    assert.deepEqual((canonical as any)[field], value, `${name}: ${field}`);
  }
  const application = canonical.application.join(" ");
  assert.equal(canonical.qualities.some(x => /@|candidature|postuler|objet du mail/i.test(x)), false, `${name}: application leaked into qualities`);
  assert.equal(canonical.missions.some(x => /@|objet du mail/i.test(x)), false, `${name}: application leaked into missions`);
  return canonical;
}

const oris = check("ORIS / JobInCamer", {
  title: "ORIS Finance recrute des Caissières et des Brands Ambassadeurs",
  companyName: "ORIS Finance S.A.",
  description: "Responsabilités du poste: accueil clientèle. Profil et critères requis: BAC +2. Modalités de candidature: CV avec photographie à recrutement@oris-finance.com. Veuillez mentionner impérativement « Agent polyvalent – Douala » en objet de votre mail. Date limite: Postulez maintenant.",
  renderedHtml: html("ORIS Finance recrute des Caissières et des Brands Ambassadeurs", "<h2>Responsabilités du poste</h2><ul><li>Accueil clientèle</li></ul><h2>Profil et critères requis</h2><p>Diplôme BAC +2.</p><h2>Modalités de candidature</h2><p>Envoyer CV avec photographie à recrutement@oris-finance.com. Veuillez mentionner impérativement « Agent polyvalent – Douala » en objet de votre mail.</p><p>Date limite: 27/09/2026</p>"),
  location: "Douala, Cameroun",
  contractType: "Temps-plein",
  deadline: "2026-09-27T23:59:59.000Z",
  source: "Job in Cameroun",
  sourceUrl: "https://www.jobincamer.com/job/oris-finance-recrute-des-caissieres-et-des-brands-ambassadeurs",
}, {
  company: "ORIS Finance S.A.",
  location: ["Douala", "Cameroun"],
  deadline: "2026-09-27T23:59:59.000Z",
});
assert.match(oris.application.join(" "), /recrutement@oris-finance\.com/i);
assert.match(oris.application.join(" "), /Agent polyvalent – Douala/i);

const educaid = check("EducAid / JobInfoCamer", {
  title: "APPEL À CANDIDATURE — Business Experts",
  companyName: "EducAid",
  description: "Organisation recruteuse : EducAid. Lieu d’affectation : Douala, Cameroun. Durée du contrat : 6 mois, renouvelable. Date limite de candidature : 1er octobre 2026 à 12h00. Modalités de candidature: CV actualisé, lettre de motivation, références professionnelles. candidatures.cameroun@educaid.it. Objet du mail : Candidature – Business expert – EducAid.",
  renderedHtml: html("APPEL À CANDIDATURE — Business Experts", "<h2>Organisation recruteuse</h2><p>EducAid</p><h2>Lieu d’affectation</h2><p>Douala, Cameroun</p><h2>Durée du contrat</h2><p>6 mois, renouvelable</p><h2>Profil recherché</h2><p>Trois années d’expérience et diplôme pertinent.</p><h2>Modalités de candidature</h2><p>CV actualisé, lettre de motivation et références. candidatures.cameroun@educaid.it</p><p>Objet du mail : Candidature – Business expert – EducAid</p><p>Date limite de candidature : 1er octobre 2026 à 12h00.</p>"),
  location: "Douala, Cameroun",
  contractType: "CDD",
  deadline: "2026-10-01T23:59:59.000Z",
  source: "JobInfoCamer",
  sourceUrl: "https://www.jobinfocamer.com/job/44904/business-experts-a-educaid",
}, {
  company: "EducAid",
  location: ["Douala", "Cameroun"],
  contractType: "CDD",
  deadline: "2026-10-01T23:59:59.000Z",
});
console.log("EDUCAID_APPLICATION_DEBUG", JSON.stringify(educaid.application));
assert.match(educaid.application.join(" "), /candidatures\.cameroun@educaid\.it/i);
assert.match(educaid.application.join(" "), /Candidature – Business expert – EducAid/i);

const fne = check("MA'MY HOUSE / FNE", {
  title: "Agent Immobilier",
  companyName: "MA’MY HOUSE SERVICES",
  description: "MA’MY HOUSE SERVICES recrute cinq agents immobiliers. Lieu de travail: Douala. Type de contrat: Freelance. Pour postuler: CV et texte présentant l’expérience. contact.mamyhouseservice@gmail.com. Objet : Candidature Agent immobilier – Douala/Yaoundé. Date limite : 1er novembre 2026.",
  renderedHtml: html("Agent Immobilier", "<h2>Missions / Tâches</h2><p>MA’MY HOUSE SERVICES recrute cinq agents immobiliers.</p><p>Lieu de travail : Douala</p><p>Type de contrat : Freelance</p><h2>Pour postuler</h2><p>CV et texte présentant l’expérience. contact.mamyhouseservice@gmail.com</p><p>Objet : Candidature Agent immobilier – Douala/Yaoundé</p><p>Date limite : 1er novembre 2026</p>"),
  location: "Douala",
  contractType: "Freelance",
  deadline: "2026-11-01T23:59:59.000Z",
  source: "FNE Cameroun",
  sourceUrl: "https://fnecm.org/offre/NET-OE-2026-009296",
}, {
  company: "MA’MY HOUSE SERVICES",
  location: ["Douala"],
  contractType: "Freelance",
  deadline: "2026-11-01T23:59:59.000Z",
});
assert.match(fne.application.join(" "), /contact\.mamyhouseservice@gmail\.com/i);

const sgs = check("SGS / Infos Concours Education", {
  title: "Offre d’emploi 2026: Technicien Magasinier Temporaire – SGS",
  companyName: "SGS",
  description: "SGS Cameroun recrute un Technicien Magasinier. Localisation : Douala, Cameroun. Type de contrat : Temporaire / Temporary. Période de candidature : Du 24.09.2026 au 01.10.2026. COMMENT POSTULEZ ? Suivre le lien de candidature.",
  renderedHtml: html("Offre d’emploi 2026: Technicien Magasinier Temporaire – SGS", "<h2>Localisation</h2><p>Douala, Cameroun</p><h2>Type de contrat</h2><p>Temporaire / Temporary</p><h2>Période de candidature</h2><p>Du 24.09.2026 au 01.10.2026</p><h2>COMMENT POSTULEZ ?</h2><p>Suivre le lien de candidature.</p>"),
  location: "Douala, Cameroun",
  contractType: "Temporaire / Temporary",
  source: "Infos Concours Education",
  sourceUrl: "https://infosconcourseducation.com/offre-demploi-2026-technicien-magasinier-temporaire-sgs/",
}, {
  company: "SGS",
  location: ["Douala", "Cameroun"],
  contractType: "Temporaire / Temporary",
});
assert.equal(sgs.deadline, null);

const mina = check("EducAid / MinaJobs", {
  title: "Avis de recrutement : 02 Business Expert",
  companyName: "EducAid",
  description: "Organisation recruteuse : EducAid. Lieu d’affectation : Douala, Cameroun. Durée du contrat : 6 mois. Date limite de candidature 1er octobre 2026 à 12h00. Objet du mail : Candidature – Business expert – EducAid. candidatures.cameroun@educaid.it.",
  renderedHtml: html("Avis de recrutement : 02 Business Expert", "<h2>Organisation recruteuse</h2><p>EducAid</p><p>Lieu d’affectation : Douala, Cameroun</p><p>Durée du contrat : 6 mois</p><h2>COMMENT POSTULER</h2><p>candidatures.cameroun@educaid.it</p><p>Objet du mail : Candidature – Business expert – EducAid</p><p>Date limite de candidature 1er octobre 2026 à 12h00.</p>"),
  location: "Douala, Cameroun",
  contractType: "CDD",
  deadline: "2026-10-01T23:59:59.000Z",
  source: "MinaJobs",
  sourceUrl: "https://cameroun.minajobs.net/emplois-stage-recrutement/44708",
}, {
  company: "EducAid",
  location: ["Douala", "Cameroun"],
  contractType: "CDD",
  deadline: "2026-10-01T23:59:59.000Z",
});
assert.match(mina.application.join(" "), /candidatures\.cameroun@educaid\.it/i);

console.log("OFFER_REGRESSION_OK", JSON.stringify({
  cases: 5,
  architecture: "rendered-html -> blocks -> semantic normalization -> canonical",
  invariant: "one fact -> one canonical owner",
}));
