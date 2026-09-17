import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-white px-5 py-8 text-navy">
      <article className="mx-auto w-full max-w-3xl">
        <Link href="/" aria-label="Retour à JOBLY" className="inline-block">
          <img src="/jobly-logo-reference.jpg" alt="JOBLY" className="h-auto w-[120px] mix-blend-multiply" />
        </Link>
        <Link href="/" className="mt-3 block text-sm font-bold text-jobly-blue">← Retour à JOBLY</Link>
        <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight">Conditions d'utilisation</h1>
        <p className="mt-2 text-sm text-jobly-gray">Dernière mise à jour : 11 septembre 2026</p>

        <div className="mt-8 space-y-7 text-[15px] leading-7 text-slate-700">
          <section><h2 className="text-xl font-extrabold text-navy">1. Objet</h2><p className="mt-2">JOBLY est une plateforme d'accompagnement de carrière qui permet notamment de consulter des opportunités professionnelles et d'utiliser des fonctionnalités d'aide à la recherche d'emploi. Les présentes conditions encadrent l'accès et l'utilisation du service.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">2. Création et sécurité du compte</h2><p className="mt-2">L'utilisateur fournit des informations exactes et à jour. Il est responsable de la confidentialité de son mot de passe et des actions réalisées depuis son compte. Un compte ne doit pas être partagé avec une autre personne.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">3. Utilisation acceptable</h2><p className="mt-2">Il est interdit d'utiliser JOBLY pour usurper une identité, publier du contenu frauduleux, contourner les mesures de sécurité, perturber le service, collecter massivement des données ou porter atteinte aux droits d'autrui.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">4. Offres et accompagnement</h2><p className="mt-2">JOBLY peut présenter des offres, recommandations ou contenus générés ou assistés par intelligence artificielle. Ces informations sont fournies comme aide à la décision et ne constituent pas une garantie d'embauche, de rémunération ou de résultat.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">5. Disponibilité</h2><p className="mt-2">JOBLY peut évoluer, être temporairement indisponible ou faire l'objet de maintenance. Certaines fonctionnalités peuvent être ajoutées, modifiées ou retirées.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">6. Contenu utilisateur</h2><p className="mt-2">L'utilisateur conserve ses droits sur les contenus qu'il fournit et autorise JOBLY à les traiter dans la mesure nécessaire au fonctionnement du service. L'utilisateur garantit qu'il dispose des droits nécessaires sur les contenus transmis.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">7. Suspension ou suppression</h2><p className="mt-2">JOBLY peut limiter ou suspendre l'accès à un compte en cas d'utilisation abusive, frauduleuse ou contraire aux présentes conditions. L'utilisateur peut demander la suppression de son compte selon les modalités proposées dans le service.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">8. Évolution des conditions</h2><p className="mt-2">Les présentes conditions peuvent être mises à jour lorsque le service évolue. La date de dernière mise à jour est affichée en haut de cette page.</p></section>
          <section><h2 className="text-xl font-extrabold text-navy">9. Contact</h2><p className="mt-2">Pour toute question relative à ces conditions, utilisez le canal de contact officiellement communiqué par JOBLY. Les coordonnées juridiques de l'exploitant seront précisées avant la mise en production commerciale.</p></section>
        </div>

        <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">Document produit pour la version actuelle de JOBLY. Il doit être relu et complété avec l'identité juridique de l'exploitant, ses coordonnées et le droit applicable avant une exploitation commerciale définitive.</p>
      </article>
    </main>
  );
}
