"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";
import {
  isJoblyAndroidPaymentSmsAvailable,
  pairJoblyPaymentSmsDevice,
  revokeJoblyPaymentSmsDeviceLocally,
  requestJoblyPaymentSmsPermission,
} from "@/lib/paymentSms/android-bridge";

type Provider = "SMS_MTN" | "SMS_ORANGE";

type ProviderConfig = {
  provider: Provider;
  merchantAccount: string;
  configured: boolean;
  active: boolean;
  merchantCodeHint: string | null;
  updatedAt?: string | null;
};

type ProviderConfigDraft = { merchantAccount: string; merchantCode: string };

type MerchantDevice = {
  id: string;
  label: string;
  provider: Provider;
  merchantAccount: string;
  senderIds: string[];
  status: string;
  lastSeenAt?: string | null;
  createdAt?: string;
};

export default function AdminPaymentSmsPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [provider, setProvider] = useState<Provider>("SMS_MTN");
  const [label, setLabel] = useState("Téléphone marchand MTN");
  const [merchantAccount, setMerchantAccount] = useState("");
  const [senderIds, setSenderIds] = useState("");
  const [devices, setDevices] = useState<MerchantDevice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [configDrafts, setConfigDrafts] = useState<Record<Provider, ProviderConfigDraft>>({
    SMS_MTN: { merchantAccount: "", merchantCode: "" },
    SMS_ORANGE: { merchantAccount: "", merchantCode: "" },
  });
  const [configBusy, setConfigBusy] = useState<Provider | null>(null);

  const loadDevices = useCallback(async (token: string) => {
    const response = await fetch("/api/payments/sms/devices", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Liste des téléphones indisponible.");
    setDevices(Array.isArray(payload.devices) ? payload.devices : []);
  }, []);

  const loadProviderConfigs = useCallback(async (token: string) => {
    const response = await fetch("/api/payments/sms/config", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Configuration Mobile Money indisponible.");
    const configs = Array.isArray(payload.configs) ? payload.configs as ProviderConfig[] : [];
    setProviderConfigs(configs);
    setConfigDrafts((current) => ({
      SMS_MTN: {
        ...current.SMS_MTN,
        merchantAccount: configs.find((item) => item.provider === "SMS_MTN")?.merchantAccount || "",
      },
      SMS_ORANGE: {
        ...current.SMS_ORANGE,
        merchantAccount: configs.find((item) => item.provider === "SMS_ORANGE")?.merchantAccount || "",
      },
    }));
    setMerchantAccount(configs.find((item) => item.provider === provider)?.merchantAccount || "");
  }, [provider]);

  async function saveProviderConfig(selectedProvider: Provider) {
    const draft = configDrafts[selectedProvider];
    if (!draft.merchantAccount.trim()) {
      setMessage("Renseigne le numéro du compte marchand.");
      return;
    }
    setConfigBusy(selectedProvider);
    setMessage("");
    try {
      const response = await fetch("/api/payments/sms/config", {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          merchantAccount: draft.merchantAccount.trim(),
          merchantCode: draft.merchantCode.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Enregistrement impossible.");
      setConfigDrafts((current) => ({
        ...current,
        [selectedProvider]: { ...current[selectedProvider], merchantCode: "" },
      }));
      await loadProviderConfigs(accessToken);
      setMessage(payload.message || "Configuration synchronisée avec Jobly.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Configuration Mobile Money impossible à enregistrer.");
    } finally {
      setConfigBusy(null);
    }
  }

  useEffect(() => {
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        router.replace("/");
        return;
      }
      const response = await fetch("/api/me", { headers: { Authorization: "Bearer " + token } });
      const payload = await response.json();
      if (!response.ok || !["ADMIN", "FINANCE"].includes(String(payload.user?.role))) {
        router.replace("/ecosystem");
        return;
      }
      setAccessToken(token);
      setIsAdmin(String(payload.user?.role) === "ADMIN");
      setNativeAvailable(isJoblyAndroidPaymentSmsAvailable());
      await Promise.all([loadDevices(token), loadProviderConfigs(token)]);
      setLoading(false);
    })().catch(() => router.replace("/ecosystem"));
  }, [router, loadDevices, loadProviderConfigs]);

  async function provision() {
    setMessage("");
    if (!nativeAvailable || !isJoblyAndroidPaymentSmsAvailable()) {
      setMessage("Ouvre cet écran depuis l’APK Jobly installé sur le téléphone qui contient la SIM marchande.");
      return;
    }
    const allowlist = [...new Set(senderIds.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))];
    if (!merchantAccount.trim() || allowlist.length === 0) {
      setMessage("Renseigne le compte marchand et au moins un nom d’expéditeur exact.");
      return;
    }
    if (allowlist.length > 10) {
      setMessage("Maximum 10 noms d’expéditeur exacts par profil.");
      return;
    }
    const normalizedAllowlist = new Set(allowlist.map((value) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase()));
    const senderAlreadyUsed = devices.some((item) =>
      item.senderIds.some((sender) => normalizedAllowlist.has(sender.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase()))
    );
    if (senderAlreadyUsed) {
      setMessage("Cet expéditeur est déjà associé à un autre profil marchand sur ce téléphone. Vérifie les identifiants exacts pour éviter tout rapprochement ambigu.");
      return;
    }
    const normalizedProvider = provider;
    if (devices.some((item) => item.provider === normalizedProvider && item.merchantAccount.replace(/\D/g, "") === merchantAccount.replace(/\D/g, ""))) {
      setMessage("Ce compte marchand est déjà appairé dans Jobly.");
      return;
    }

    setBusy("provision");
    try {
      const response = await fetch("/api/payments/sms/devices", {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ label, provider, merchantAccount: merchantAccount.trim(), senderIds: allowlist }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Provisionnement impossible.");

      const paired = pairJoblyPaymentSmsDevice({
        deviceId: payload.device.id,
        deviceToken: payload.deviceToken,
        senderIds: payload.device.senderIds || allowlist,
      });
      if (!paired) {
        await fetch("/api/payments/sms/devices/" + payload.device.id, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + accessToken },
        }).catch(() => undefined);
        throw new Error("Le pont Android n’a pas accepté l’appairage ; le profil serveur a été révoqué.");
      }

      await loadDevices(accessToken);
      setMerchantAccount("");
      setSenderIds("");
      setMessage("Profil marchand appairé dans le même APK Jobly. Android va demander l’autorisation de réception SMS. Tu peux ajouter l’autre opérateur sans écraser ce profil.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Provisionnement impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(device: MerchantDevice) {
    setBusy(device.id);
    setMessage("");
    try {
      const response = await fetch("/api/payments/sms/devices/" + device.id, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + accessToken },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Révocation impossible.");
      revokeJoblyPaymentSmsDeviceLocally(device.id);
      setDevices((current) => current.filter((item) => item.id !== device.id));
      setMessage("Profil " + device.label + " révoqué. Les tâches SMS de ce profil sont annulées sans affecter l’autre opérateur.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Révocation impossible.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold">Vérification des accès…</main>;

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] text-slate-900">
      <PageHeader eyebrow="ADMIN · FINANCE" label="Réception Mobile Money" onBack={() => router.push("/admin")} />
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-7">
        <div>
          <h1 className="text-3xl font-black">Téléphones marchands Jobly</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Les codes marchands et numéros de réception sont administrés ici, côté serveur. Les changements sont utilisés
            par les prochaines commandes sur Web, PWA et APK, sans redéployer Jobly.
          </p>
        </div>

        {!nativeAvailable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            La liste peut être consultée depuis Web/PWA. Pour appairer une SIM et recevoir ses SMS, ouvre cet écran dans
            l’APK Jobly installé sur le téléphone marchand. Le site Web ne peut pas lire la boîte SMS.
          </div>
        )}

        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black">Configuration marchande centralisée</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Un code et un numéro par opérateur. Le code existant n’est jamais réaffiché ; laisse le champ vide pour le conserver.
              Toute modification est appliquée aux nouvelles commandes, sans redéploiement.
            </p>
          </div>
          {(["SMS_MTN", "SMS_ORANGE"] as Provider[]).map((operator) => {
            const saved = providerConfigs.find((item) => item.provider === operator);
            const draft = configDrafts[operator];
            return (
              <article key={operator} className="space-y-3 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black">{operator === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money"}</h3>
                  <span className={saved?.configured ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-amber-700"}>
                    {saved?.configured ? "Configuré" : "À configurer"}
                  </span>
                </div>
                <label className="block text-sm font-bold">
                  Numéro du compte marchand / SIM de réception
                  <input
                    value={draft.merchantAccount}
                    onChange={(event) => setConfigDrafts((current) => ({ ...current, [operator]: { ...current[operator], merchantAccount: event.target.value } }))}
                    placeholder="2376XXXXXXXX"
                    autoComplete="off"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono"
                    disabled={!isAdmin}
                  />
                </label>
                <label className="block text-sm font-bold">
                  Code marchand {saved?.merchantCodeHint ? <span className="text-xs font-normal text-slate-500">({saved.merchantCodeHint} actuellement)</span> : null}
                  <input
                    type="password"
                    value={draft.merchantCode}
                    onChange={(event) => setConfigDrafts((current) => ({ ...current, [operator]: { ...current[operator], merchantCode: event.target.value } }))}
                    placeholder={saved?.configured ? "Laisser vide pour conserver" : "Saisir le code marchand"}
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono"
                    disabled={!isAdmin}
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {saved?.updatedAt ? "Dernière mise à jour : " + new Date(saved.updatedAt).toLocaleString("fr-FR") : "Aucun paramètre enregistré."}
                  </p>
                  {isAdmin && (
                    <button
                      disabled={configBusy !== null}
                      onClick={() => saveProviderConfig(operator)}
                      className="rounded-xl bg-[#0B2A5B] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {configBusy === operator ? "Synchronisation…" : "Enregistrer et synchroniser"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!isAdmin && <p className="text-xs text-slate-500">Le rôle Finance peut consulter l’état masqué. Seul un administrateur peut modifier les paramètres.</p>}
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Le changement de numéro de réception doit être suivi de l’appairage de la nouvelle SIM dans l’APK Jobly.
            Les profils restent isolés par opérateur ; aucune permission SMS n’est accordée à distance.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Profils appairés · {devices.length}</h2>
            <button onClick={() => Promise.all([loadDevices(accessToken), loadProviderConfigs(accessToken)]).catch((error) => setMessage(error.message))} className="rounded-full border bg-white px-4 py-2 text-xs font-bold">
              Actualiser les paramètres
            </button>
          </div>
          {devices.map((device) => (
            <article key={device.id} className="space-y-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Actif · {device.provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money"}</div>
                  <h3 className="mt-1 text-lg font-black">{device.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">Compte marchand : {device.merchantAccount}</p>
                  {(() => {
                    const centralAccount = providerConfigs.find((item) => item.provider === device.provider)?.merchantAccount;
                    const normalizedDevice = device.merchantAccount.replace(/\\D/g, "");
                    const normalizedCentral = String(centralAccount || "").replace(/\\D/g, "");
                    return centralAccount && normalizedDevice !== normalizedCentral ? (
                      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Ce téléphone écoute encore l’ancien compte marchand. La nouvelle SIM doit être appairée pour recevoir les confirmations des prochaines commandes.</p>
                    ) : null;
                  })()}
                  <p className="mt-1 text-xs text-slate-500">Expéditeurs autorisés : {device.senderIds.join(", ")}</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{device.id}</p>
                  <p className="mt-1 text-xs text-slate-500">Dernier contact : {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString("fr-FR") : "Pas encore reçu de SMS"}</p>
                </div>
                <button disabled={busy === device.id} onClick={() => revoke(device)} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50">
                  {busy === device.id ? "Révocation…" : "Révoquer ce profil"}
                </button>
              </div>
              {nativeAvailable && (
                <button onClick={() => requestJoblyPaymentSmsPermission()} className="rounded-xl bg-[#0B2A5B] px-4 py-3 text-sm font-bold text-white">
                  Réessayer l’autorisation SMS
                </button>
              )}
            </article>
          ))}
          {devices.length === 0 && <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500">Aucun téléphone marchand appairé.</div>}
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black">Ajouter un profil marchand</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Tu peux enregistrer une SIM MTN et une SIM Orange dans le même APK. Le sender ID doit être unique entre les profils de ce téléphone pour éviter tout rapprochement ambigu.</p>
          </div>
          <label className="block text-sm font-bold">
            Opérateur
            <select value={provider} onChange={(event) => {
              const next = event.target.value as Provider;
              setProvider(next);
              setMerchantAccount(providerConfigs.find((item) => item.provider === next)?.merchantAccount || "");
              setLabel(next === "SMS_MTN" ? "Téléphone marchand MTN" : "Téléphone marchand Orange");
            }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
              <option value="SMS_MTN">MTN Mobile Money</option>
              <option value="SMS_ORANGE">Orange Money</option>
            </select>
          </label>
          <label className="block text-sm font-bold">
            Nom du profil
            <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="block text-sm font-bold">
            Numéro du compte marchand sur cette SIM
            <input value={merchantAccount} onChange={(event) => setMerchantAccount(event.target.value)} placeholder="2376XXXXXXXX" autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono" />
          </label>
          <label className="block text-sm font-bold">
            Noms d’expéditeur SMS exacts
            <textarea value={senderIds} onChange={(event) => setSenderIds(event.target.value)} rows={3} placeholder={"Copie ici les expéditeurs observés sur de vrais SMS opérateur, un par ligne"} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm" />
          </label>
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            N’utilise jamais un nom supposé. Les expéditeurs doivent provenir de vrais SMS reçus sur cette SIM.
            Un nom d’expéditeur seul ne suffit jamais à valider un paiement.
          </p>
          <button disabled={busy !== null || !nativeAvailable} onClick={provision} className="w-full rounded-2xl bg-[#0B2A5B] px-5 py-3 font-black text-white disabled:opacity-40">
            {busy === "provision" ? "Appairage…" : "Appairer ce profil dans l’APK Jobly"}
          </button>
        </section>

        {message && <p role="status" className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">{message}</p>}

        <section className="rounded-2xl bg-slate-900 p-5 text-sm leading-6 text-white">
          <b>Permission Android restreinte</b>
          <p className="mt-2 text-slate-200">
            Selon la version Android et le mode d’installation, l’installateur peut devoir autoriser explicitement RECEIVE_SMS.
            L’appairage seul ne garantit pas cette permission : elle devra être contrôlée sur le téléphone marchand réel.
          </p>
          <p className="mt-2 text-slate-200">Jobly ne lit pas l’historique SMS, ne transmet que les expéditeurs autorisés et ne demande jamais le PIN Mobile Money.</p>
        </section>
      </div>
    </main>
  );
}
