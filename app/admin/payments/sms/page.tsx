"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";
import {
  isJoblyAndroidPaymentSmsAvailable,
  pairJoblyPaymentSmsDevice,
  revokeJoblyPaymentSmsDeviceLocally,
} from "@/lib/paymentSms/android-bridge";

type Provider = "SMS_MTN" | "SMS_ORANGE";

type MerchantDevice = {
  id: string;
  label: string;
  provider: Provider;
  merchantAccount: string;
  status: string;
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
  const [device, setDevice] = useState<MerchantDevice | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
      setNativeAvailable(isJoblyAndroidPaymentSmsAvailable());
      setLoading(false);
    })().catch(() => router.replace("/ecosystem"));
  }, [router]);

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
    setBusy(true);
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
        throw new Error("Le pont Android n’a pas accepté l’appairage ; le téléphone serveur a été révoqué.");
      }
      setDevice(payload.device);
      setMessage("Téléphone appairé dans l’APK Jobly. Android va demander l’autorisation de réception SMS. Aucun SMS ne sera envoyé tant que cette permission n’est pas accordée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Provisionnement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!device) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments/sms/devices/" + device.id, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + accessToken },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Révocation impossible.");
      revokeJoblyPaymentSmsDeviceLocally();
      setDevice(null);
      setMessage("Téléphone révoqué côté serveur et jeton local supprimé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Révocation impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold">Vérification des accès…</main>;

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] text-slate-900">
      <PageHeader eyebrow="ADMIN · FINANCE" label="Réception Mobile Money" onBack={() => router.push("/admin")} />
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-7">
        <div>
          <h1 className="text-3xl font-black">Téléphone marchand Jobly</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Appaire ce même APK Jobly au téléphone qui reçoit les SMS de confirmation MTN ou Orange Money.
            Le jeton est transmis au composant natif et chiffré avec Android Keystore ; il n’est pas affiché à l’écran.
          </p>
        </div>

        {!nativeAvailable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Cet écran doit être ouvert dans l’APK Jobly sur le téléphone marchand. Le Web/PWA sert à consulter les paiements,
            mais ne peut pas lire la boîte SMS du téléphone.
          </div>
        )}

        {device ? (
          <section className="space-y-3 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Téléphone appairé</div>
            <h2 className="text-xl font-black">{device.label}</h2>
            <div className="text-sm text-slate-600">{device.provider === "SMS_MTN" ? "MTN Mobile Money" : "Orange Money"} · {device.merchantAccount}</div>
            <div className="break-all rounded-xl bg-slate-50 p-3 font-mono text-xs">{device.id}</div>
            <button disabled={busy} onClick={revoke} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50">
              Révoquer ce téléphone
            </button>
          </section>
        ) : (
          <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <label className="block text-sm font-bold">
              Opérateur
              <select value={provider} onChange={(event) => {
                const next = event.target.value as Provider;
                setProvider(next);
                setLabel(next === "SMS_MTN" ? "Téléphone marchand MTN" : "Téléphone marchand Orange");
              }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                <option value="SMS_MTN">MTN Mobile Money</option>
                <option value="SMS_ORANGE">Orange Money</option>
              </select>
            </label>
            <label className="block text-sm font-bold">
              Nom du téléphone
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
              Ne saisis pas de nom supposé. Utilise uniquement les identifiants exacts observés sur des SMS officiels reçus par ce téléphone marchand.
              Un nom d’expéditeur seul ne suffit jamais à valider un paiement.
            </p>
            <button disabled={busy || !nativeAvailable} onClick={provision} className="w-full rounded-2xl bg-[#0B2A5B] px-5 py-3 font-black text-white disabled:opacity-40">
              {busy ? "Appairage…" : "Appairer ce téléphone"}
            </button>
          </section>
        )}

        {message && <p role="status" className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">{message}</p>}

        <section className="rounded-2xl bg-slate-900 p-5 text-sm leading-6 text-white">
          <b>À propos de la permission Android</b>
          <p className="mt-2 text-slate-200">
            Android traite la réception SMS comme une permission restreinte. Selon la version du système et le mode d’installation,
            l’installateur peut devoir autoriser explicitement cette permission. L’appairage seul ne garantit donc pas que le système
            autorise la réception : il faudra vérifier l’état sur ce téléphone réel.
          </p>
          <p className="mt-2 text-slate-200">Jobly ne demande jamais le PIN Mobile Money et ne conserve pas le texte brut du SMS sur le serveur.</p>
        </section>
      </div>
    </main>
  );
}
