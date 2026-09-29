import { blocksToStructuredText, extractVisibleOfferBlocks } from "../lib/jobOfferBlocks";

type Case = { name: string; html: string; mustContain: string[]; mustNotContain: string[] };

const cases: Case[] = [
  {
    name: "ORIS Finance / JobInCamer",
    html: `<html><header>Main navigation Accueil Poster une offre</header><main class="job-detail">
      <h1>ORIS Finance recrute des Caissières et des Brands Ambassadeurs</h1>
      <p>ORIS Finance est à la recherche de nouveaux profils féminins.</p>
      <h2>Responsabilités du poste</h2><ul><li>Assurer une réception chaleureuse et professionnelle.</li><li>Piloter les transactions de caisse.</li></ul>
      <h2>Profil et critères requis</h2><ul><li>Être une femme âgée de 26 ans au maximum.</li><li>Justifier d'un diplôme de niveau BAC +2 au minimum.</li></ul>
      <h2>Modalités de candidature</h2><p>Faites parvenir votre CV complet à recrutement@oris-finance.com.</p><p>Veuillez mentionner impérativement « Agent polyvalent – Douala » en objet de votre mail.</p>
      <p>Localisation: Douala, Cameroun</p><p>Postuler avant: Dimanche, 27-09-2026</p>
    </main><footer>Contactez-nous info@jobincamer.com Copyright 2025</footer></html>`,
    mustContain: ["Modalités de candidature","recrutement@oris-finance.com","Douala","27-09-2026"],
    mustNotContain: ["Main navigation","Copyright 2025","info@jobincamer.com"],
  },
  {
    name: "EducAid / MinaJobs",
    html: `<nav>Menu Accueil</nav><article class="offer-content"><h1>Avis de recrutement : 02 Help Desks</h1>
      <p>Lieu d'affectation Yaoundé, Cameroun</p><p>Type de contrat CDD 6 mois</p>
      <h2>Missions principales</h2><ul><li>Assurer l'accueil des bénéficiaires.</li></ul>
      <h2>Profil recherché</h2><ul><li>Minimum Bac +3.</li><li>Expérience professionnelle d'au moins 1 an.</li></ul>
      <h2>Dossier de candidature</h2><p>CV et lettre de motivation à candidatures.cameroun@educaid.it</p><p>Objet du mail : Candidature – Help Desk – EducAid Yaoundé</p>
      <p>Date limite : 28 septembre 2026</p></article><footer>cameroun.minajobs.net</footer>`,
    mustContain: ["Dossier de candidature","candidatures.cameroun@educaid.it","Objet du mail","CDD 6 mois"],
    mustNotContain: ["Menu Accueil","cameroun.minajobs.net"],
  },
  {
    name: "ARCHIPEL CM / Emplois Cameroun",
    html: `<header>Emplois Cameroun</header><article class="offer"><h1>ARCHIPEL CM recrute un(e) Téléconseiller(ère) à Douala</h1>
      <p>Entreprise : ARCHIPEL CM</p><p>Lieu : Douala</p><h2>Missions principales</h2><ul><li>Gérer les appels téléphoniques entrants et sortants.</li></ul>
      <h2>Profil recherché</h2><ul><li>Être titulaire d'au minimum le Baccalauréat.</li></ul>
      <h2>Comment postuler</h2><p>Envoyez votre dossier par e-mail à candidature@exemple.cm</p><p>Date limite de candidature : 02 octobre 2026</p></article><footer>Emplois Cameroun ne demande jamais de paiement</footer>`,
    mustContain: ["Comment postuler","Envoyez votre dossier par e-mail","02 octobre 2026"],
    mustNotContain: ["Emplois Cameroun","ne demande jamais de paiement"],
  },
  {
    name: "SGS / Infos Concours Education",
    html: `<div class="menu">Home Blog</div><article class="entry-content"><h1>Offre d’emploi SGS Cameroun : QHSE & Business Continuity</h1>
      <p>Lieu : Douala, Cameroun</p><p>Type de contrat : CDI</p><h2>À propos du poste</h2><p>SGS Cameroun recherche un(e) QHSE & Business Continuity Manager.</p>
      <h2>Principales responsabilités</h2><ul><li>Développer une culture forte de prévention.</li></ul></article><footer>Le Bénévole Page 34</footer>`,
    mustContain: ["SGS Cameroun","Douala","CDI","Principales responsabilités"],
    mustNotContain: ["Home Blog","Le Bénévole Page 34"],
  },
];

let failures = 0;
for (const test of cases) {
  const blocks = extractVisibleOfferBlocks(test.html);
  const text = blocksToStructuredText(blocks);
  for (const expected of test.mustContain) {
    if (!text.toLowerCase().includes(expected.toLowerCase())) {
      failures++;
      console.error(`FAIL ${test.name}: missing "${expected}"`);
    }
  }
  for (const forbidden of test.mustNotContain) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      failures++;
      console.error(`FAIL ${test.name}: leaked "${forbidden}"`);
    }
  }
  console.log(`[${failures ? "FAIL" : "OK"}] ${test.name}: ${blocks.length} blocks`);
}
if (failures) process.exit(1);
console.log("Offer block regression: PASS");
