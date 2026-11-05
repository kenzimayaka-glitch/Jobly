export default function PartnerUnavailable({ section }: { section: string }) {
  return (
    <main className="min-h-[100dvh] bg-white px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">MOBILITY PARTNER · NON ACTIVÉ</span>
        <h1 className="mt-4 text-3xl font-black">{section}</h1>
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-white p-6">
          <p className="text-sm font-bold text-slate-900">Le parcours prestataire Mobility n'est pas encore opérationnel en production.</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le schéma de production ne contient pas le registre des prestataires Finance, Housing et Transport ni leurs offres et affectations. Le profil Partner existant sert à l'affiliation et ne peut pas autoriser l'accès aux dossiers de mobilité ou aux financements.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            L'activation exige un registre prestataire dédié, les contrôles KYC et contractuels, le rattachement à un programme et à un dossier, puis les contrôles de décaissement. Aucun financement ne doit être présenté comme payé avant confirmation d'une transaction par un prestataire de paiement.
          </p>
        </div>
      </div>
    </main>
  );
}
