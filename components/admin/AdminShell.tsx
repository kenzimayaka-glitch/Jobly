"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { ADMIN_WORKSPACE_TEMPLATES, type AdminWorkspaceCode } from "@/lib/adminWorkspaceCatalog";

type WorkspaceRow = { id: string; code: AdminWorkspaceCode; label: string; enabled: boolean };
type ManagedAccountRow = { id: string; accountType: string; organizationName?: string | null; status: string; user?: { email?: string | null; displayName?: string | null } | null };
const NAV = [
  { href: "/admin", label: "Vue générale", group: "Pilotage" },
  { href: "/admin/workspaces", label: "Espaces métier", group: "Pilotage" },
  { href: "/admin/support", label: "Tickets Support", group: "Opérations" },
  { href: "/admin/finance", label: "Cockpit Finance", group: "Finance" },
  { href: "/admin/community", label: "Modération Community", group: "Opérations" },
  { href: "/admin/analytics", label: "Intelligence 360 · BI", group: "Intelligence" },
  { href: "/admin/accounts", label: "Comptes & institutions", group: "Écosystème" },
  { href: "/admin/jia", label: "J’IA · CEO", group: "Intelligence" },
  { href: "/admin/jia/chat", label: "J’IA · Copilot", group: "Intelligence" },
  { href: "/admin/jobs/reprocess", label: "Offres & ingestion", group: "Opérations" },
  { href: "/admin/recruiter-offer-claims", label: "Réclamations offres recruteur", group: "Opérations" },
  { href: "/admin/mobility", label: "Mobility", group: "Opérations" },
  { href: "/admin/events/payments", label: "Paiements événements", group: "Finance" },
  { href: "/admin/payments/sms", label: "Mobile Money", group: "Finance" },
  { href: "/admin/partners/create", label: "Partenaires", group: "Écosystème" },
  { href: "/admin/promo-codes", label: "Codes Pro", group: "Écosystème" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/admin";
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState("");
  const [spaces, setSpaces] = useState<WorkspaceRow[]>([]);
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccountRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) { router.replace("/"); return; }
      const response = await fetch("/api/me", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.user?.role !== "ADMIN" || !body.capabilities?.canSwitchAdmin) {
        router.replace("/ecosystem");
        return;
      }
      if (!alive) return;
      setToken(accessToken);
      setAuthorized(true);
      try {
        const spacesResponse = await fetch("/api/admin/workspaces", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
        const spacesBody = await spacesResponse.json().catch(() => ({}));
        if (spacesResponse.ok) setSpaces((spacesBody.workspaces || []).filter((space: WorkspaceRow) => space.enabled));
      } catch {}
      try {
        const accountsResponse = await fetch("/api/admin/accounts", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
        const accountsBody = await accountsResponse.json().catch(() => ({}));
        if (accountsResponse.ok) setManagedAccounts(accountsBody.accounts || []);
      } catch {}
      setChecking(false);
    })().catch(() => { if (alive) router.replace("/ecosystem"); });
    return () => { alive = false; };
  }, [router, pathname]);

  async function switchToUser() {
    setMessage("");
    try {
      const response = await fetch("/api/admin/context", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "USER" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Changement d'espace impossible.");
      router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Changement d'espace impossible.");
    }
  }

  if (checking) return <main className="grid min-h-[100dvh] place-items-center bg-[#F4F7FC] font-semibold text-[#17315D]">Vérification de l'identité administrateur…</main>;
  if (!authorized) return null;

  const isActive = (href: string) => pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
  const groups = ["Pilotage", "Intelligence", "Opérations", "Finance", "Écosystème"];

  return (
    <div className="min-h-[100dvh] bg-[#F4F7FC] text-[#10264A] xl:flex">
      <aside className="hidden w-[270px] shrink-0 border-r border-[#E1E8F2] bg-[#10264A] text-white xl:flex xl:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FFE135]">JOBLY · 360°</div>
          <div className="mt-2 text-xl font-black">Administration</div>
          <div className="mt-1 text-xs text-white/55">Compte maître · accès contrôlé</div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <section key={group} className="mb-5">
              <div className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{group}</div>
              {NAV.filter((item) => item.group === group).map((item) => (
                <button key={item.href} onClick={() => router.push(item.href)} className={"mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition " + (isActive(item.href) ? "bg-[#FFE135] text-[#10264A]" : "text-white/75 hover:bg-white/10 hover:text-white")}>
                  <span className="mr-2.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />{item.label}
                </button>
              ))}
            </section>
          ))}
          <section className="mb-5">
            <div className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Espaces ADMIN</div>
            {ADMIN_WORKSPACE_TEMPLATES.map((template) => {
              const enabled = spaces.some((space) => space.code === template.code && space.enabled);
              const active = pathname.endsWith("/" + template.code);
              return (
                <button
                  key={template.code}
                  onClick={() => router.push(enabled ? "/admin/workspaces/" + template.code : "/admin/workspaces")}
                  aria-label={template.label + (enabled ? " · espace activé" : " · créer l'espace")}
                  className={"mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition " + (active ? "bg-[#FFE135] text-[#10264A]" : "text-white/75 hover:bg-white/10 hover:text-white")}
                >
                  <span className="flex items-center">
                    <span className={"mr-2.5 inline-block h-1.5 w-1.5 rounded-full " + (enabled ? "bg-[#FFE135]" : "bg-white/35")} />
                    {template.label}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-wide opacity-60">{enabled ? "Actif" : "Créer"}</span>
                </button>
              );
            })}
          </section>
        </nav>
        <div className="border-t border-white/10 p-4">
          <button onClick={switchToUser} className="w-full rounded-xl bg-white px-4 py-3 text-left text-xs font-black text-[#10264A] hover:bg-[#FFE135]">
            ↗ Passer en mode utilisateur
          </button>
          <div className="mt-2 text-center text-[9px] text-white/40">Même identité · permissions séparées</div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-[#E1E8F2] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6A7890] xl:hidden">JOBLY · ADMIN 360°</div>
              <div className="text-sm font-black text-[#10264A]">Centre de pilotage</div>
            </div>
            <button onClick={switchToUser} className="shrink-0 rounded-full border border-[#DCE4F0] px-4 py-2 text-[11px] font-black text-[#17315D] hover:bg-[#FFF5C2] xl:hidden">
              Mode utilisateur
            </button>
            <label className="min-w-0 flex-1 xl:max-w-[330px]">
              <span className="sr-only">Sélectionner un compte à administrer</span>
              <select defaultValue="" onChange={(event) => { const id = event.target.value; if (id) router.push("/admin/accounts/" + encodeURIComponent(id)); }} className="min-h-10 w-full rounded-full border border-[#DCE4F0] bg-white px-3 text-[10px] font-bold text-[#43536C]">
                <option value="">Compte maître · changer de contexte…</option>
                {managedAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountType} · {account.organizationName || account.user?.displayName || account.user?.email || "Compte Jobly"}</option>)}
              </select>
            </label>
            <div className="hidden rounded-full border border-[#DCE4F0] px-3 py-2 text-[10px] font-bold text-[#52627B] xl:block">Compte ADMIN maître</div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {NAV.map((item) => (
              <button key={item.href} onClick={() => router.push(item.href)} className={"shrink-0 rounded-full px-3 py-2 text-[10px] font-bold " + (isActive(item.href) ? "bg-[#FFE135] text-[#10264A]" : "bg-[#F1F4F9] text-[#53627B]")}>{item.label}</button>
            ))}
            <button onClick={() => router.push("/admin/workspaces")} className="shrink-0 rounded-full bg-[#F1F4F9] px-3 py-2 text-[10px] font-bold text-[#53627B]">Espaces</button>
          </nav>
        </header>
        {message && <div className="px-4 pt-3 text-sm font-bold text-red-700 sm:px-6">{message}</div>}
        {children}
      </div>
    </div>
  );
}
