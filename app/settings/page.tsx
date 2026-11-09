"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { saveOfflineDocument, saveOfflineSnapshot, type OfflineSnapshot } from "@/lib/offline-store";

type Device = {
  deviceId: string;
  label: string;
  userAgent: string | null;
  connectedAt: string;
  lastSeenAt: string;
  current: boolean;
  active: boolean;
};
type Notice = { tone: "success" | "error" | "info"; message: string };

const BACKUP_FORMAT = "jobly-encrypted-backup";
const BACKUP_VERSION = 1;
const KDF_ITERATIONS = 310_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function getAccessToken() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Connectez-vous à Jobly pour effectuer cette opération.");
  return data.session.access_token;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"offline" | "backup" | "restore" | "devices" | "">("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [offlineExpiry, setOfflineExpiry] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [online, setOnline] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadDevices = useCallback(async () => {
    if (!navigator.onLine) return;
    setBusy((value) => value === "" ? "devices" : value);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/device-sessions", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Liste des appareils indisponible.");
      setDevices(Array.isArray(payload.devices) ? payload.devices as Device[] : []);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Impossible de charger les appareils." });
    } finally {
      setBusy((value) => value === "devices" ? "" : value);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void loadDevices();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [loadDevices]);

  async function prepareOffline() {
    setBusy("offline");
    setNotice(null);
    try {
      if (!navigator.onLine) throw new Error("Connectez-vous à Internet pour préparer ou actualiser les données hors connexion.");
      const token = await getAccessToken();
      const response = await fetch("/api/offline/bootstrap", {
        headers: { Authorization: `Bearer ${token}`, "x-jobly-offline-bootstrap": "1" },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Téléchargement hors connexion impossible.");
      const snapshot = payload as OfflineSnapshot;
      await saveOfflineSnapshot(snapshot);
      const cvResponse = await fetch("/api/account/backup/files/cv", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (cvResponse.ok) {
        const cv = await cvResponse.blob();
        await saveOfflineDocument(snapshot.userId, cv);
      } else if (cvResponse.status !== 404) {
        const cvError = await cvResponse.json().catch(() => ({}));
        throw new Error(cvError.message || "Le CV n'a pas pu être téléchargé pour le mode hors connexion.");
      }
      setOfflineExpiry(snapshot.expiresAt);
      setNotice({ tone: "success", message: "Les données essentielles sont chiffrées et disponibles sur cet appareil pendant 7 jours. La synchronisation automatique est activée." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Préparation hors connexion impossible." });
    } finally {
      setBusy("");
    }
  }

  async function createEncryptedBackup() {
    if (passphrase.length < 12) {
      setNotice({ tone: "error", message: "Choisissez une phrase secrète d'au moins 12 caractères." });
      return;
    }
    if (passphrase !== confirmation) {
      setNotice({ tone: "error", message: "Les deux saisies de la phrase secrète ne correspondent pas." });
      return;
    }
    setBusy("backup");
    setNotice(null);
    try {
      if (!navigator.onLine) throw new Error("Une sauvegarde complète doit être préparée lorsque Jobly est connecté.");
      const token = await getAccessToken();
      const response = await fetch("/api/account/backup", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const backup = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(backup.message || "Impossible de préparer la sauvegarde.");

      const zip = new JSZip();
      zip.file("manifest.json", JSON.stringify({
        format: "JOBLY_ACCOUNT_ARCHIVE",
        version: 1,
        generatedAt: backup.generatedAt,
        encryption: "AES-256-GCM / PBKDF2-SHA256",
        included: ["Profil", "Expériences", "Compétences", "Formations", "Historique de candidatures", "CV original si présent"],
      }, null, 2));
      zip.file("account-data.json", JSON.stringify(backup, null, 2));

      const cvResponse = await fetch("/api/account/backup/files/cv", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (cvResponse.ok) {
        const cv = await cvResponse.blob();
        if (cv.size > 12 * 1024 * 1024) throw new Error("Le CV dépasse la limite de 12 Mo.");
        zip.file("documents/cv-original.pdf", cv);
      } else if (cvResponse.status !== 404) {
        const cvError = await cvResponse.json().catch(() => ({}));
        throw new Error(cvError.message || "Le CV n'a pas pu être inclus dans la sauvegarde.");
      }

      const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveBackupKey(passphrase, salt);
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
        key,
        archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer,
      );
      const envelope = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        kdf: "PBKDF2-SHA256",
        iterations: KDF_ITERATIONS,
        cipher: "AES-256-GCM",
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(encrypted)),
      };
      downloadBlob(new Blob([JSON.stringify(envelope)], { type: "application/vnd.jobly.backup+json" }), `jobly-backup-${new Date().toISOString().slice(0, 10)}.joblybackup`);
      setNotice({ tone: "success", message: "Sauvegarde chiffrée créée. Conservez le fichier et la phrase secrète séparément : Jobly ne peut pas récupérer une phrase secrète perdue." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Création de la sauvegarde impossible." });
    } finally {
      setBusy("");
    }
  }

  async function restoreEncryptedBackup() {
    if (!restoreFile) {
      fileInput.current?.click();
      return;
    }
    if (passphrase.length < 12) {
      setNotice({ tone: "error", message: "Saisissez la phrase secrète de cette sauvegarde (12 caractères minimum)." });
      return;
    }
    setBusy("restore");
    setNotice(null);
    try {
      if (!navigator.onLine) throw new Error("La restauration du compte nécessite une connexion Internet. Le fichier local reste intact.");
      if (restoreFile.size > 30 * 1024 * 1024) throw new Error("Le fichier de sauvegarde dépasse 30 Mo.");
      const envelope = JSON.parse(await restoreFile.text()) as Record<string, unknown>;
      if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION ||
          envelope.kdf !== "PBKDF2-SHA256" || envelope.cipher !== "AES-256-GCM" ||
          envelope.iterations !== KDF_ITERATIONS ||
          typeof envelope.salt !== "string" || typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string") {
        throw new Error("Ce fichier n'est pas une sauvegarde Jobly compatible.");
      }
      const salt = base64ToBytes(envelope.salt);
      const iv = base64ToBytes(envelope.iv);
      if (salt.length !== 16 || iv.length !== 12) throw new Error("Métadonnées de chiffrement invalides.");
      const key = await deriveBackupKey(passphrase, salt);
      let plain: ArrayBuffer;
      try {
        const encryptedIv = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
        const encryptedPayload = base64ToBytes(envelope.ciphertext);
        const encryptedBuffer = encryptedPayload.buffer.slice(
          encryptedPayload.byteOffset,
          encryptedPayload.byteOffset + encryptedPayload.byteLength,
        ) as ArrayBuffer;
        plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: encryptedIv }, key, encryptedBuffer);
      } catch {
        throw new Error("Phrase secrète incorrecte ou fichier de sauvegarde endommagé.");
      }
      const zip = await JSZip.loadAsync(new Uint8Array(plain));
      const dataFile = zip.file("account-data.json");
      if (!dataFile) throw new Error("Le fichier ne contient pas les données de compte Jobly.");
      const backup = JSON.parse(await dataFile.async("string")) as Record<string, unknown>;
      const token = await getAccessToken();
      const response = await fetch("/api/account/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(backup),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Les données n'ont pas pu être restaurées.");

      const cvEntry = zip.file("documents/cv-original.pdf");
      if (cvEntry) {
        const cv = await cvEntry.async("blob");
        const form = new FormData();
        form.append("file", new File([cv], "cv-restaure.pdf", { type: "application/pdf" }));
        const cvResponse = await fetch("/api/account/backup/files/cv", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const cvResult = await cvResponse.json().catch(() => ({}));
        if (!cvResponse.ok) throw new Error(cvResult.message || "Les données ont été restaurées, mais le CV n'a pas pu être réimporté.");
      }
      setNotice({ tone: "success", message: `Restauration terminée : ${result.restored?.experiencesAdded ?? 0} expérience(s), ${result.restored?.skillsAdded ?? 0} compétence(s) et ${result.restored?.educationAdded ?? 0} formation(s) ajoutée(s). Les candidatures existantes ont été préservées.` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Restauration impossible." });
    } finally {
      setBusy("");
    }
  }

  async function revokeDevice(deviceId: string) {
    setBusy("devices");
    setNotice(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/device-sessions/${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Déconnexion impossible.");
      setNotice({ tone: "success", message: "Appareil déconnecté. Il sera bloqué par les API Jobly lors de son prochain accès en ligne." });
      await loadDevices();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Déconnexion de l'appareil impossible." });
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    setNotice(null);
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.localStorage.removeItem("jobly:gmail-connection");
      router.replace("/");
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Déconnexion impossible.",
      });
      setSigningOut(false);
    }
  }

  const activeDevices = devices.filter((device) => device.active);

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 pb-16 pt-8 text-[#0A1931] sm:pt-10">
      <div className="mx-auto max-w-4xl">
        <a href="/dashboard" className="text-sm font-bold text-[#2457B8]">← Retour à Jobly</a>
        <header className="mt-5 rounded-3xl bg-[#0A1931] p-6 text-white shadow-[0_18px_45px_rgba(10,25,49,.15)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#FFD60A]">JOBLY · PARAMÈTRES DU COMPTE</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Vos données, vos appareils, votre continuité.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Préparez Jobly pour les zones à faible réseau, gardez une copie personnelle de vos informations et contrôlez les appareils connectés à votre compte.</p>
        </header>

        {notice ? (
          <div role="status" className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : notice.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
            {notice.message}
          </div>
        ) : null}

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-xl">📶</div>
            <h2 className="mt-3 text-lg font-black">Préparer le mode hors connexion</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Téléchargez votre profil, votre historique, vos candidatures et jusqu'à 100 offres récentes. La copie est chiffrée sur cet appareil et expire après 7 jours.</p>
            <button type="button" onClick={prepareOffline} disabled={busy !== "" || !online} className="mt-4 h-11 w-full rounded-xl bg-[#FFD60A] px-4 text-sm font-extrabold text-[#0A1931] disabled:opacity-50">
              {busy === "offline" ? "Préparation…" : "Télécharger mes données sur cet appareil"}
            </button>
            <a href="/offline" className="mt-3 block text-center text-xs font-bold text-[#2457B8]">Ouvrir mon espace hors connexion →</a>
            {offlineExpiry ? <p className="mt-2 text-center text-[11px] text-slate-500">Disponible jusqu'au {new Date(offlineExpiry).toLocaleString("fr-FR")}</p> : null}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-xl">🔐</div>
            <h2 className="mt-3 text-lg font-black">Sauvegarde personnelle chiffrée</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Créez un fichier protégé par une phrase secrète. Il contient vos informations de profil, expériences, compétences, formations, historique de candidatures et le CV PDF original si présent.</p>
            <label className="mt-3 block text-xs font-bold text-slate-600">Phrase secrète (12 caractères minimum)
              <input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/>
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Confirmer la phrase secrète
              <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/>
            </label>
            <button type="button" onClick={createEncryptedBackup} disabled={busy !== "" || !online} className="mt-4 h-11 w-full rounded-xl bg-[#0A1931] px-4 text-sm font-extrabold text-white disabled:opacity-50">
              {busy === "backup" ? "Chiffrement…" : "Créer et télécharger ma sauvegarde"}
            </button>
          </article>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-xl">♻️</div>
          <h2 className="mt-3 text-lg font-black">Restaurer une sauvegarde</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Sélectionnez un fichier .joblybackup et sa phrase secrète. Les informations de profil seront fusionnées sans supprimer vos données actuelles. Les candidatures existantes ne seront ni dupliquées ni remplacées.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input ref={fileInput} type="file" accept=".joblybackup,application/vnd.jobly.backup+json" onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} className="block min-w-0 flex-1 text-xs text-slate-600"/>
            <button type="button" onClick={restoreEncryptedBackup} disabled={busy !== "" || !online} className="h-11 rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#0A1931] disabled:opacity-50">
              {busy === "restore" ? "Restauration…" : "Restaurer"}
            </button>
          </div>
          {restoreFile ? <p className="mt-2 text-xs text-slate-500">Fichier sélectionné : {restoreFile.name}</p> : null}
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-xl">📱</div>
              <h2 className="mt-3 text-lg font-black">Mes appareils connectés</h2>
              <p className="mt-1 text-sm text-slate-600">Trois appareils maximum. Une quatrième connexion remplace la plus ancienne.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-2 text-sm font-black text-blue-900">{activeDevices.length} / 3</span>
          </div>
          <div className="mt-4 space-y-3">
            {devices.map((device) => (
              <div key={device.deviceId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg">▣</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{device.label} {device.current ? "· Cet appareil" : ""}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{device.active ? "Actif" : "Déconnecté"} · Dernière activité {new Date(device.lastSeenAt).toLocaleString("fr-FR")}</p>
                </div>
                {device.current ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">Actuel</span> : device.active ? (
                  <button type="button" onClick={() => void revokeDevice(device.deviceId)} disabled={busy !== ""} className="rounded-full border border-red-200 px-3 py-2 text-[11px] font-bold text-red-700 disabled:opacity-50">Déconnecter</button>
                ) : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">Révoqué</span>}
              </div>
            ))}
            {devices.length === 0 ? <p className="text-sm text-slate-500">Connectez-vous à Internet pour afficher vos appareils.</p> : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Un appareil hors connexion ne peut pas recevoir instantanément une révocation. Dès qu'il retrouve Internet, les API Jobly vérifient sa session et le déconnectent si elle a été remplacée.</p>
        </section>

        <section aria-labelledby="jobly-session-title" className="mt-4 rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
          <h2 id="jobly-session-title" className="text-lg font-black">Session Jobly</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Fermez la session de Jobly sur cet appareil. Les autres appareils restent gérés séparément dans la liste ci-dessus.</p>
          <button
            type="button"
            data-testid="jobly-logout-button"
            aria-label="Se déconnecter de Jobly"
            onClick={() => void logout()}
            disabled={signingOut}
            className="mt-4 h-11 w-full rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {signingOut ? "Déconnexion…" : "Se déconnecter de Jobly"}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          <strong>À retenir :</strong> conservez votre fichier de sauvegarde et sa phrase secrète dans deux endroits différents. Si vous perdez cette phrase, Jobly ne peut pas déchiffrer votre archive. Le mode hors connexion n'autorise pas les paiements, les envois définitifs de candidatures ou les actions qui nécessitent une vérification serveur.
        </section>
      </div>
    </main>
  );
}
