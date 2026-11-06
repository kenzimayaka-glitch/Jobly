export type OfflineSnapshot = {
  userId: string;
  authUserId: string;
  generatedAt: string;
  expiresAt: string;
  user: Record<string, unknown>;
  profile: Record<string, unknown>;
  experiences: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  education: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  offers: Record<string, unknown>[];
  role?: string;
  recruiterProfile?: Record<string, unknown> | null;
  recruiterJobs?: Record<string, unknown>[];
  partnerProfile?: Record<string, unknown> | null;
};

export type OfflineOperation =
  | { id: string; type: "profile.update"; createdAt: string; payload: { headline?: string; summary?: string; location?: string; targetRoles?: string[]; preferredSectors?: string[] } }
  | { id: string; type: "application.prepare"; createdAt: string; payload: { jobId?: string; recruiterJobId?: string; language?: string } }
  | { id: string; type: "recruiter.job-draft"; createdAt: string; payload: { title: string; description: string; location?: string; contract?: string; salary?: string; sector?: string; tags?: string[] } };

type EncryptedRecord = {
  id: string;
  userId: string;
  kind: "snapshot" | "queue" | "document";
  iv: number[] | ArrayBuffer;
  ciphertext: number[] | ArrayBuffer;
  updatedAt: string;
};
type StoredKey = { userId: string; key: CryptoKey };

const DB_NAME = "jobly-offline-v1";
const DB_VERSION = 1;
const OFFLINE_USER_KEY = "jobly-offline-user-v1";
const MAX_OFFLINE_DAYS = 7;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Le stockage hors connexion n'est pas disponible sur cet appareil."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys", { keyPath: "userId" });
      if (!db.objectStoreNames.contains("records")) {
        const store = db.createObjectStore("records", { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossible d'ouvrir le stockage hors connexion."));
  });
}

async function getEncryptionKey(userId: string): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) throw new Error("Le chiffrement local nécessite un navigateur sécurisé (HTTPS).");
  const db = await openDatabase();
  try {
    const existing = await new Promise<StoredKey | undefined>((resolve, reject) => {
      const request = db.transaction("keys", "readonly").objectStore("keys").get(userId);
      request.onsuccess = () => resolve(request.result as StoredKey | undefined);
      request.onerror = () => reject(request.error);
    });
    if (existing?.key) return existing.key;

    const generated = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return await new Promise<CryptoKey>((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      const store = tx.objectStore("keys");
      const get = store.get(userId);
      let selected = generated;
      get.onsuccess = () => {
        if (get.result?.key) selected = (get.result as StoredKey).key;
        else store.put({ userId, key: generated } satisfies StoredKey);
      };
      tx.oncomplete = () => resolve(selected);
      tx.onerror = () => reject(tx.error || new Error("Impossible de protéger les données hors connexion."));
      tx.onabort = () => reject(tx.error || new Error("Le chiffrement local a été interrompu."));
    });
  } finally {
    db.close();
  }
}

async function encryptRecord(userId: string, id: string, kind: EncryptedRecord["kind"], value: unknown) {
  const key = await getEncryptionKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const record: EncryptedRecord = {
    id,
    userId,
    kind,
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    updatedAt: new Date().toISOString(),
  };
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Impossible d'enregistrer les données locales."));
      tx.onabort = () => reject(tx.error || new Error("Écriture locale interrompue."));
    });
  } finally {
    db.close();
  }
}

async function decryptRecord<T>(record: EncryptedRecord): Promise<T> {
  const key = await getEncryptionKey(record.userId);
  const iv = record.iv instanceof ArrayBuffer ? new Uint8Array(record.iv) : new Uint8Array(record.iv);
  const ciphertext = record.ciphertext instanceof ArrayBuffer ? new Uint8Array(record.ciphertext) : new Uint8Array(record.ciphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}


export async function saveOfflineDocument(userId: string, blob: Blob) {
  if (!userId || !blob.size || blob.size > 12 * 1024 * 1024) {
    throw new Error("Document hors connexion invalide (12 Mo maximum).");
  }
  const key = await getEncryptionKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await blob.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const record: EncryptedRecord = {
    id: `document:${userId}:cv`,
    userId,
    kind: "document",
    iv: iv.buffer.slice(0),
    ciphertext,
    updatedAt: new Date().toISOString(),
  };
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      tx.objectStore("records").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Impossible de protéger le CV hors connexion."));
    });
  } finally { db.close(); }
}

export async function getOfflineDocument(userId: string): Promise<Blob | null> {
  const db = await openDatabase();
  let record: EncryptedRecord | undefined;
  try {
    record = await new Promise<EncryptedRecord | undefined>((resolve, reject) => {
      const request = db.transaction("records", "readonly").objectStore("records").get(`document:${userId}:cv`);
      request.onsuccess = () => resolve(request.result as EncryptedRecord | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
  if (!record || record.kind !== "document") return null;
  const key = await getEncryptionKey(userId);
  const iv = record.iv instanceof ArrayBuffer ? new Uint8Array(record.iv) : new Uint8Array(record.iv);
  const encrypted = record.ciphertext instanceof ArrayBuffer ? record.ciphertext : new Uint8Array(record.ciphertext).buffer;
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new Blob([plaintext], { type: "application/pdf" });
}

export function getOfflineUserId() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(OFFLINE_USER_KEY); } catch { return null; }
}

export async function saveOfflineSnapshot(snapshot: OfflineSnapshot) {
  const expiry = new Date(snapshot.expiresAt).getTime();
  if (!snapshot.userId || !Number.isFinite(expiry) || expiry <= Date.now()) {
    throw new Error("La copie hors connexion reçue est invalide ou déjà expirée.");
  }
  if (expiry > Date.now() + MAX_OFFLINE_DAYS * 24 * 60 * 60 * 1000 + 5 * 60 * 1000) {
    throw new Error("La durée de conservation hors connexion dépasse la limite autorisée.");
  }
  await encryptRecord(snapshot.userId, `snapshot:${snapshot.userId}`, "snapshot", snapshot);
  try { window.localStorage.setItem(OFFLINE_USER_KEY, snapshot.userId); } catch {}
}

export async function getOfflineSnapshot(userId = getOfflineUserId(), expectedAuthUserId?: string): Promise<OfflineSnapshot | null> {
  if (!userId) return null;
  const db = await openDatabase();
  let record: EncryptedRecord | undefined;
  try {
    record = await new Promise<EncryptedRecord | undefined>((resolve, reject) => {
      const request = db.transaction("records", "readonly").objectStore("records").get(`snapshot:${userId}`);
      request.onsuccess = () => resolve(request.result as EncryptedRecord | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
  if (!record) return null;
  const snapshot = await decryptRecord<OfflineSnapshot>(record);
  if (new Date(snapshot.expiresAt).getTime() <= Date.now()) {
    await clearOfflineData(userId);
    return null;
  }
  if (expectedAuthUserId && snapshot.authUserId !== expectedAuthUserId) return null;
  return snapshot;
}

export async function updateOfflineSnapshot(userId: string, updater: (snapshot: OfflineSnapshot) => OfflineSnapshot) {
  const current = await getOfflineSnapshot(userId);
  if (!current) throw new Error("Aucune copie hors connexion valide n'est disponible.");
  await saveOfflineSnapshot(updater(current));
}

export async function enqueueOfflineOperation(userId: string, operation: OfflineOperation) {
  if (!operation.id || !operation.createdAt) throw new Error("Opération hors connexion invalide.");
  await encryptRecord(userId, `queue:${userId}:${operation.id}`, "queue", operation);
}

export async function getPendingOfflineOperations(userId: string): Promise<OfflineOperation[]> {
  const db = await openDatabase();
  let records: EncryptedRecord[];
  try {
    records = await new Promise<EncryptedRecord[]>((resolve, reject) => {
      const request = db.transaction("records", "readonly").objectStore("records").index("userId").getAll(userId);
      request.onsuccess = () => resolve((request.result as EncryptedRecord[]).filter((row) => row.kind === "queue"));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
  const operations = await Promise.all(records.map((record) => decryptRecord<OfflineOperation>(record)));
  return operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removePendingOfflineOperations(userId: string, ids: string[]) {
  if (!ids.length) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("records", "readwrite");
      const store = tx.objectStore("records");
      for (const id of ids) store.delete(`queue:${userId}:${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Impossible de vider la file de synchronisation."));
    });
  } finally { db.close(); }
}

export async function countPendingOfflineOperations(userId = getOfflineUserId()): Promise<number> {
  if (!userId) return 0;
  return (await getPendingOfflineOperations(userId)).length;
}

export async function clearOfflineData(userId: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["records", "keys"], "readwrite");
      const records = tx.objectStore("records");
      const request = records.index("userId").openKeyCursor(IDBKeyRange.only(userId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) { records.delete(cursor.primaryKey); cursor.continue(); }
      };
      tx.objectStore("keys").delete(userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Impossible d'effacer les données hors connexion."));
    });
  } finally { db.close(); }
  try {
    if (window.localStorage.getItem(OFFLINE_USER_KEY) === userId) window.localStorage.removeItem(OFFLINE_USER_KEY);
  } catch {}
}
