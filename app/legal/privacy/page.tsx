import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-white px-5 py-8 text-navy">
      <article className="mx-auto w-full max-w-3xl">
        <Link href="/" aria-label="Retour à JOBLY" className="inline-block">
          <img src="/jobly-logo-reference.jpg" alt="JOBLY" className="h-auto w-[120px] mix-blend-multiply" />
        </Link>
        <Link href="/" className="mt-3 block text-sm font-bold text-jobly-blue">← Retour à JOBLY</Link>
        <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-jobly-gray">Dernière mise à jour : 11 septembre 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-7 text-slate-700">
          <section><h2 className="text-xl font-extrabold text-navy">1. Données traitées</h2><p className="mt-2">Selon les fonctionnalités utilisées, JOBLY peut traiter des informations de compte telles qu'un numéro de téléphone, une adresse e-mail, un nom ou des informations nécessaires au profil professionnel. Les données techniques indispensables au fonctionnement et à la sécurité du service peuvent également être traitées.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">2. Finalités</h2><p className="mt-2">Les données sont utilisées pour créer et sécuriser le compte, authentifier l'utilisateur, fournir les fonctionnalités de recherche d'emploi et d'accompagnement, personnaliser l'expérience, prévenir les abus et assurer le fonctionnement technique de JOBLY.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">3. Authentification</h2><p className="mt-2">JOBLY peut utiliser une authentification par téléphone, e-mail ou un fournisseur externe tel que Google lorsque cette option est activée. Le mot de passe n'est pas enregistré dans le stockage local du navigateur.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">4. Stockage local</h2><p className="mt-2">Pour améliorer le retour sur l'application, JOBLY peut mémoriser localement certaines informations non sensibles, notamment le numéro de téléphone nécessaire au Smart Return. Le mot de passe n'est pas mémorisé localement par cette fonctionnalité.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">5. Prestataires</h2><p className="mt-2">Certaines données peuvent être traitées par des prestataires techniques utilisés pour l'hébergement, l'authentification, la base de données ou les fonctionnalités du service. JOBLY cherche à limiter les données transmises à ce qui est nécessaire à chaque fonction.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">6. Conservation</h2><p className="mt-2">Les données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles sont traitées, sous réserve des obligations légales applicables. Les périodes précises de conservation seront documentées à mesure que les fonctionnalités de production seront finalisées.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">7. Droits</h2><p className="mt-2">Selon le droit applicable, l'utilisateur peut disposer de droits d'accès, de rectification, d'effacement, de limitation, d'opposition ou de portabilité. Une demande peut être adressée au canal de contact officiellement communiqué par JOBLY.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">8. Sécurité</h2><p className="mt-2">JOBLY applique des mesures techniques et organisationnelles raisonnables pour protéger les données. Aucune transmission ou infrastructure sur Internet ne peut toutefois être garantie comme absolument invulnérable.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">9. Contact et identité du responsable</h2><p className="mt-2">L'identité juridique complète du responsable du traitement, son adresse et son adresse e-mail de confidentialité doivent être ajoutées avant la mise en production commerciale définitive.</p></section>
        </div>

        <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">Document produit pour la version actuelle de JOBLY. Il doit être relu et complété avec les informations juridiques de l'exploitant et les périodes de conservation définitives avant une exploitation commerciale.</p>
      </article>
    </main>
  );
}
