import { createHash, X509Certificate, verify as verifySignature } from "node:crypto";

const ROOTS_URL = "https://android.googleapis.com/attestation/root";
const STATUS_URL = "https://android.googleapis.com/attestation/status";
const ATTESTATION_OID = "1.3.6.1.4.1.11129.2.1.17";
const ATTESTATION_APPLICATION_ID_TAG = 709;
const ROOT_OF_TRUST_TAG = 704;
const MAX_CERTIFICATES = 8;
const MAX_CHAIN_BYTES = 96 * 1024;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type DerNode = {
  tagClass: number;
  tagNumber: number;
  constructed: boolean;
  content: Buffer;
  children: DerNode[];
};

type CacheEntry<T> = { value: T; expiresAt: number };
type RevocationDocument = { entries?: Record<string, { status?: string }> };

let rootsCache: CacheEntry<X509Certificate[]> | null = null;
let revocationCache: CacheEntry<RevocationDocument> | null = null;

export type AndroidKeyAttestationResult = {
  publicKeyPem: string;
  certificateFingerprintSha256: string;
  securityLevel: "TRUSTED_ENVIRONMENT" | "STRONGBOX";
  verifiedBootState: "VERIFIED";
  deviceLocked: true;
  packageName: "com.jobly.android";
  attestedAt: string;
};

function parseDerNode(input: Buffer, offset = 0): { node: DerNode; next: number } {
  if (offset >= input.length) throw new Error("DER_TRUNCATED");
  let cursor = offset;
  const first = input[cursor++];
  const tagClass = first >> 6;
  const constructed = (first & 0x20) !== 0;
  let tagNumber = first & 0x1f;

  if (tagNumber === 0x1f) {
    tagNumber = 0;
    let count = 0;
    while (true) {
      if (cursor >= input.length || count++ > 5) throw new Error("DER_INVALID_TAG");
      const byte = input[cursor++];
      tagNumber = tagNumber * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) break;
    }
  }

  if (cursor >= input.length) throw new Error("DER_TRUNCATED_LENGTH");
  const firstLength = input[cursor++];
  let length = firstLength;
  if ((firstLength & 0x80) !== 0) {
    const lengthBytes = firstLength & 0x7f;
    if (lengthBytes === 0 || lengthBytes > 4 || cursor + lengthBytes > input.length) {
      throw new Error("DER_INVALID_LENGTH");
    }
    length = 0;
    for (let i = 0; i < lengthBytes; i++) length = length * 256 + input[cursor++];
    if (length < 128) throw new Error("DER_NON_CANONICAL_LENGTH");
  }
  const end = cursor + length;
  if (end > input.length) throw new Error("DER_LENGTH_OUT_OF_RANGE");
  const content = input.subarray(cursor, end);
  const children: DerNode[] = [];

  if (constructed) {
    let childOffset = cursor;
    while (childOffset < end) {
      const parsed = parseDerNode(input, childOffset);
      if (parsed.next <= childOffset || parsed.next > end) throw new Error("DER_INVALID_CHILD");
      children.push(parsed.node);
      childOffset = parsed.next;
    }
    if (childOffset !== end) throw new Error("DER_INVALID_CONSTRUCTED_VALUE");
  }

  return { node: { tagClass, tagNumber, constructed, content, children }, next: end };
}

function parseDer(input: Buffer): DerNode {
  const parsed = parseDerNode(input);
  if (parsed.next !== input.length) throw new Error("DER_TRAILING_DATA");
  return parsed.node;
}

function decodeOid(bytes: Buffer): string {
  if (!bytes.length) throw new Error("DER_EMPTY_OID");
  const first = bytes[0];
  const parts = [Math.min(Math.floor(first / 40), 2), first < 80 ? first % 40 : first - 80];
  let value = 0;
  for (let i = 1; i < bytes.length; i++) {
    value = value * 128 + (bytes[i] & 0x7f);
    if ((bytes[i] & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }
  if ((bytes[bytes.length - 1] & 0x80) !== 0) throw new Error("DER_INVALID_OID");
  return parts.join(".");
}

function integerValue(node: DerNode): number {
  if (!node.content.length || node.content.length > 6) throw new Error("DER_INVALID_INTEGER");
  let value = 0;
  for (const byte of node.content) {
    value = value * 256 + byte;
    if (!Number.isSafeInteger(value)) throw new Error("DER_INTEGER_OUT_OF_RANGE");
  }
  return value;
}

function explicitChild(node: DerNode): DerNode {
  if (node.tagClass !== 2 || !node.constructed || node.children.length !== 1) {
    throw new Error("ATTESTATION_INVALID_EXPLICIT_FIELD");
  }
  return node.children[0];
}

function findContextField(node: DerNode, tagNumber: number): DerNode | undefined {
  return node.children.find((child) => child.tagClass === 2 && child.tagNumber === tagNumber);
}

function explicitIntegerField(node: DerNode, tagNumber: number): number | null {
  const field = findContextField(node, tagNumber);
  if (!field) return null;
  const value = explicitChild(field);
  if (value.tagNumber !== 2) throw new Error("ATTESTATION_INTEGER_FIELD_INVALID");
  return Number(integerValue(value));
}

function explicitIntegerSet(node: DerNode, tagNumber: number): number[] {
  const field = findContextField(node, tagNumber);
  if (!field) return [];
  const set = explicitChild(field);
  if (set.tagNumber !== 17) throw new Error("ATTESTATION_INTEGER_SET_INVALID");
  return set.children.map((item) => Number(integerValue(item)));
}

function findAttestationExtension(certificateDer: Buffer): Buffer | null {
  const certificate = parseDer(certificateDer);
  if (certificate.tagClass !== 0 || certificate.tagNumber !== 16 || certificate.children.length !== 3) {
    throw new Error("CERTIFICATE_DER_INVALID");
  }
  const tbs = certificate.children[0];
  const extensions = tbs.children.find((child) => child.tagClass === 2 && child.tagNumber === 3);
  if (!extensions) return null;
  const extensionSequence = explicitChild(extensions);
  for (const extension of extensionSequence.children) {
    if (extension.tagNumber !== 16 || extension.children.length < 2) continue;
    const oid = decodeOid(extension.children[0].content);
    if (oid !== ATTESTATION_OID) continue;
    const value = extension.children[extension.children.length - 1];
    if (value.tagClass !== 0 || value.tagNumber !== 4) throw new Error("ATTESTATION_EXTENSION_INVALID");
    return value.content;
  }
  return null;
}

function parseAttestationDescription(extension: Buffer, expectedChallengeHash: string, expectedSigner: string) {
  const description = parseDer(extension);
  if (description.tagNumber !== 16 || description.children.length !== 8) {
    throw new Error("ATTESTATION_DESCRIPTION_INVALID");
  }

  if (description.children[1].tagNumber !== 10 || description.children[3].tagNumber !== 10 ||
      description.children[4].tagNumber !== 4 || description.children[6].tagNumber !== 16 ||
      description.children[7].tagNumber !== 16) {
    throw new Error("ATTESTATION_DESCRIPTION_FIELD_TYPES_INVALID");
  }
  const attestationSecurityLevel = Number(integerValue(description.children[1]));
  const keySecurityLevel = Number(integerValue(description.children[3]));
  if (![1, 2].includes(attestationSecurityLevel) || ![1, 2].includes(keySecurityLevel)) {
    throw new Error("ATTESTATION_NOT_HARDWARE_BACKED");
  }

  const challenge = description.children[4];
  if (challenge.tagNumber !== 4 || createHash("sha256").update(challenge.content).digest("hex") !== expectedChallengeHash) {
    throw new Error("ATTESTATION_CHALLENGE_MISMATCH");
  }

  const softwareEnforced = description.children[6];
  const hardwareEnforced = description.children[7];
  const purposes = explicitIntegerSet(hardwareEnforced, 1);
  const algorithm = explicitIntegerField(hardwareEnforced, 2);
  const keySize = explicitIntegerField(hardwareEnforced, 3);
  const digests = explicitIntegerSet(hardwareEnforced, 5);
  const origin = explicitIntegerField(hardwareEnforced, 702);
  if (!purposes.includes(2) || !purposes.includes(3) ||
      algorithm !== 3 || keySize !== 256 || !digests.includes(4) || origin !== 0) {
    throw new Error("ATTESTATION_KEY_AUTHORIZATION_PROFILE_INVALID");
  }
  const rootField = findContextField(hardwareEnforced, ROOT_OF_TRUST_TAG);
  if (!rootField) throw new Error("HARDWARE_ROOT_OF_TRUST_MISSING");
  const root = explicitChild(rootField);
  const rootSequence = root.tagNumber === 16 ? root : root.children[0];
  if (!rootSequence || rootSequence.children.length < 3) throw new Error("ROOT_OF_TRUST_INVALID");

  if (rootSequence.children[1].tagNumber !== 1 || rootSequence.children[2].tagNumber !== 10) {
    throw new Error("ROOT_OF_TRUST_FIELD_TYPES_INVALID");
  }
  const deviceLocked = rootSequence.children[1].content.length === 1 && rootSequence.children[1].content[0] === 0xff;
  const verifiedBootState = Number(integerValue(rootSequence.children[2]));
  if (!deviceLocked || verifiedBootState !== 0) throw new Error("DEVICE_BOOT_STATE_UNTRUSTED");

  const appIdField =
    findContextField(hardwareEnforced, ATTESTATION_APPLICATION_ID_TAG) ??
    findContextField(softwareEnforced, ATTESTATION_APPLICATION_ID_TAG);
  if (!appIdField) throw new Error("ATTESTATION_APPLICATION_ID_MISSING");
  const appIdOctets = explicitChild(appIdField);
  if (appIdOctets.tagNumber !== 4) throw new Error("ATTESTATION_APPLICATION_ID_INVALID");
  const appId = parseDer(appIdOctets.content);
  if (appId.tagNumber !== 16 || appId.children.length !== 2) throw new Error("ATTESTATION_APPLICATION_ID_INVALID");

  const packageSet = appId.children[0];
  const signerSet = appId.children[1];
  if (packageSet.tagNumber !== 17 || signerSet.tagNumber !== 17) {
    throw new Error("ATTESTATION_APPLICATION_ID_SET_INVALID");
  }
  const packageNames = packageSet.children.flatMap((item) => {
    if (item.tagNumber !== 16 || !item.children.length) return [];
    const name = item.children[0];
    return name.tagNumber === 4 ? [name.content.toString("utf8")] : [];
  });
  const signerDigests = signerSet.children
    .filter((item) => item.tagNumber === 4)
    .map((item) => item.content.toString("hex").toUpperCase());

  if (!packageNames.includes("com.jobly.android") || !signerDigests.includes(expectedSigner)) {
    throw new Error("ATTESTATION_APPLICATION_ID_MISMATCH");
  }

  return {
    securityLevel: keySecurityLevel === 2 ? "STRONGBOX" as const : "TRUSTED_ENVIRONMENT" as const,
    verifiedBootState: "VERIFIED" as const,
    deviceLocked: true as const,
  };
}

function normalizeFingerprint(value: string) {
  return value.replace(/[^a-f0-9]/gi, "").toUpperCase();
}

async function fetchJson<T>(url: string): Promise<{ data: T; maxAgeMs: number }> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(7_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("ATTESTATION_TRUST_SOURCE_UNAVAILABLE");
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("ATTESTATION_TRUST_SOURCE_TOO_LARGE");
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1] ?? 0);
  return { data: JSON.parse(text) as T, maxAgeMs: Math.min(Math.max(maxAge * 1000, 5 * 60_000), 24 * 60 * 60_000) };
}

async function googleRoots(): Promise<X509Certificate[]> {
  if (rootsCache && rootsCache.expiresAt > Date.now()) return rootsCache.value;
  const { data, maxAgeMs } = await fetchJson<string[]>(ROOTS_URL);
  if (!Array.isArray(data) || data.length < 1 || data.length > 8) throw new Error("ATTESTATION_ROOTS_INVALID");
  const roots = data.map((pem) => new X509Certificate(pem));
  rootsCache = { value: roots, expiresAt: Date.now() + Math.min(maxAgeMs, CACHE_TTL_MS) };
  return roots;
}

async function googleRevocations(): Promise<RevocationDocument> {
  if (revocationCache && revocationCache.expiresAt > Date.now()) return revocationCache.value;
  const { data, maxAgeMs } = await fetchJson<RevocationDocument>(STATUS_URL);
  if (!data || typeof data.entries !== "object" || !data.entries) throw new Error("ATTESTATION_REVOCATION_LIST_INVALID");
  revocationCache = { value: data, expiresAt: Date.now() + Math.min(maxAgeMs, CACHE_TTL_MS) };
  return data;
}

function isRevoked(certificate: X509Certificate, entries: Record<string, { status?: string }>) {
  const serialHex = certificate.serialNumber.replace(/^0+/, "").toLowerCase();
  let decimalDigits = [0];
  for (const char of serialHex) {
    const nibble = Number.parseInt(char, 16);
    if (!Number.isInteger(nibble)) return false;
    let carry = nibble;
    for (let i = decimalDigits.length - 1; i >= 0; i--) {
      const next = decimalDigits[i] * 16 + carry;
      decimalDigits[i] = next % 10;
      carry = Math.floor(next / 10);
    }
    while (carry > 0) {
      decimalDigits.unshift(carry % 10);
      carry = Math.floor(carry / 10);
    }
  }
  const serialDecimal = decimalDigits.join("");
  const entry = entries[serialHex] ?? entries[serialDecimal];
  const status = entry?.status?.toUpperCase();
  return status === "REVOKED" || status === "SUSPENDED";
}

function buildTrustedChain(leaf: X509Certificate, presented: X509Certificate[], roots: X509Certificate[]) {
  const candidates = [...presented, ...roots];
  const trustedFingerprints = new Set(roots.map((root) => root.fingerprint256));
  const chain: X509Certificate[] = [leaf];
  const visited = new Set([leaf.fingerprint256]);
  let current = leaf;

  for (let depth = 0; depth < MAX_CERTIFICATES; depth++) {
    if (trustedFingerprints.has(current.fingerprint256)) return chain;
    const issuer = candidates.find((candidate) =>
      candidate.ca &&
      candidate.fingerprint256 !== current.fingerprint256 &&
      !visited.has(candidate.fingerprint256) &&
      candidate.subject === current.issuer &&
      current.verify(candidate.publicKey)
    );
    if (!issuer) throw new Error("ATTESTATION_CERTIFICATE_CHAIN_UNTRUSTED");
    chain.push(issuer);
    visited.add(issuer.fingerprint256);
    current = issuer;
  }
  throw new Error("ATTESTATION_CERTIFICATE_CHAIN_TOO_LONG");
}

export async function verifyAndroidKeyAttestation(input: {
  certificateChain: string[];
  challengeHash: string;
}): Promise<AndroidKeyAttestationResult> {
  if (!Array.isArray(input.certificateChain) || input.certificateChain.length < 2 ||
      input.certificateChain.length > MAX_CERTIFICATES) {
    throw new Error("ATTESTATION_CERTIFICATE_CHAIN_INVALID");
  }
  let totalBytes = 0;
  const presented = input.certificateChain.map((encoded) => {
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > 96_000) {
      throw new Error("ATTESTATION_CERTIFICATE_ENCODING_INVALID");
    }
    const der = Buffer.from(encoded, "base64");
    if (der.toString("base64") !== encoded) throw new Error("ATTESTATION_CERTIFICATE_ENCODING_INVALID");
    totalBytes += der.length;
    return new X509Certificate(der);
  });
  if (totalBytes > MAX_CHAIN_BYTES) throw new Error("ATTESTATION_CERTIFICATE_CHAIN_TOO_LARGE");

  const expectedSigner = normalizeFingerprint(process.env.JOBLY_ANDROID_RELEASE_CERT_SHA256 ?? "");
  if (!/^[A-F0-9]{64}$/.test(expectedSigner)) throw new Error("ATTESTATION_SIGNING_IDENTITY_NOT_CONFIGURED");
  if (!/^[a-f0-9]{64}$/.test(input.challengeHash)) throw new Error("ATTESTATION_CHALLENGE_HASH_INVALID");

  const now = Date.now();
  const [roots, revocations] = await Promise.all([googleRoots(), googleRevocations()]);
  const chain = buildTrustedChain(presented[0], presented, roots);
  const legacyFactoryChain = chain.some((certificate) =>
    /serialNumber\\s*=\\s*f92009e853b6b045/i.test(certificate.subject)
  );
  for (const certificate of chain) {
    if (Date.parse(certificate.validFrom) > now ||
        (Date.parse(certificate.validTo) < now && !legacyFactoryChain)) {
      throw new Error("ATTESTATION_CERTIFICATE_EXPIRED");
    }
    if (isRevoked(certificate, revocations.entries ?? {})) {
      throw new Error("ATTESTATION_CERTIFICATE_REVOKED");
    }
  }

  // Android documents that the first key-attestation extension encountered
  // from the root toward the leaf is the only trusted occurrence. Newer RKP
  // chains can carry other extensions on intermediate certificates.
  let attestationCertificate: X509Certificate | null = null;
  let attestationExtension: Buffer | null = null;
  for (const certificate of [...chain].reverse()) {
    const candidate = findAttestationExtension(certificate.raw);
    if (candidate) {
      attestationCertificate = certificate;
      attestationExtension = candidate;
      break;
    }
  }
  if (!attestationCertificate || !attestationExtension) {
    throw new Error("ATTESTATION_EXTENSION_MISSING");
  }

  const attestedKey = attestationCertificate.publicKey;
  if (attestationCertificate.ca || attestedKey.asymmetricKeyType !== "ec" ||
      attestedKey.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
    throw new Error("ATTESTATION_LEAF_KEY_PROFILE_INVALID");
  }

  const attestation = parseAttestationDescription(
    attestationExtension,
    input.challengeHash,
    expectedSigner,
  );

  return {
    publicKeyPem: attestedKey.export({ type: "spki", format: "pem" }).toString(),
    certificateFingerprintSha256: attestationCertificate.fingerprint256,
    ...attestation,
    packageName: "com.jobly.android",
    attestedAt: new Date(now).toISOString(),
  };
}

export function verifyAndroidRequestSignature(input: {
  publicKeyPem: string;
  payload: string;
  signature: string;
}): boolean {
  if (typeof input.payload !== "string" || input.payload.length > 4096 ||
      typeof input.signature !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(input.signature)) return false;
  const signature = Buffer.from(input.signature, "base64");
  if (signature.toString("base64") !== input.signature || signature.length < 64 || signature.length > 80) {
    return false;
  }
  try {
    return verifySignature("sha256", Buffer.from(input.payload, "utf8"), input.publicKeyPem, signature);
  } catch {
    return false;
  }
}
