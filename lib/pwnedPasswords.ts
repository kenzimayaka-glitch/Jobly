/**
 * Free Have I Been Pwned Pwned Passwords range lookup.
 *
 * Privacy contract:
 * - The candidate is hashed locally with Web Crypto SHA-1.
 * - Only the first five hexadecimal characters are sent to HIBP.
 * - The complete hash and raw password are never sent, logged, cached or stored.
 * - The request is made only on final submit, never while the user types.
 */
export type PasswordExposureResult = {
  compromised: boolean;
  occurrences: number;
};

export class PwnedPasswordLookupError extends Error {
  constructor() {
    super(
      "La vérification de sécurité est momentanément indisponible. Vérifie ta connexion puis réessaie."
    );
    this.name = "PwnedPasswordLookupError";
  }
}

type PwnedLookupOptions = {
  fetchImpl?: typeof fetch;
  cryptoImpl?: Pick<Crypto, "subtle">;
  timeoutMs?: number;
};

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const DEFAULT_TIMEOUT_MS = 8_000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkPasswordExposure(
  password: string,
  options: PwnedLookupOptions = {}
): Promise<PasswordExposureResult> {
  if (!password) {
    throw new Error("Le mot de passe est obligatoire.");
  }

  const cryptoApi = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new PwnedPasswordLookupError();
  }

  let fullHash: string;
  try {
    const digest = await cryptoApi.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(password)
    );
    fullHash = toHex(new Uint8Array(digest));
  } catch {
    throw new PwnedPasswordLookupError();
  }

  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(`${HIBP_RANGE_URL}${prefix}`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
        "Add-Padding": "true",
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("HIBP lookup failed");
    }

    const body = await response.text();
    let validRows = 0;
    let occurrences = 0;

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;

      const match = /^([0-9A-F]{35}):([0-9]+)$/i.exec(line);
      if (!match) continue;

      const count = Number(match[2]);
      if (!Number.isSafeInteger(count)) continue;
      validRows += 1;

      // HIBP's Add-Padding rows have a count of zero and are discarded.
      if (match[1].toUpperCase() === suffix && count > 0) {
        occurrences = count;
        break;
      }
    }

    // Every five-character range is expected to return a populated range.
    // An empty/unparseable response is treated as a service error, not as safe.
    if (validRows === 0) {
      throw new Error("Invalid HIBP response");
    }

    return { compromised: occurrences > 0, occurrences };
  } catch {
    throw new PwnedPasswordLookupError();
  } finally {
    clearTimeout(timeout);
  }
}

export async function assertPasswordNotPwned(
  password: string,
  options: PwnedLookupOptions = {}
): Promise<void> {
  const result = await checkPasswordExposure(password, options);
  if (result.compromised) {
    throw new Error(
      "Ce mot de passe apparaît dans des fuites de données connues. Choisis un mot de passe différent."
    );
  }
}
