import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPasswordNotPwned,
  checkPasswordExposure,
  PwnedPasswordLookupError,
} from "../lib/pwnedPasswords.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const password = "password";
const knownFullHash = "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8";
const knownPrefix = knownFullHash.slice(0, 5);
const knownSuffix = knownFullHash.slice(5);

function response(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

test("HIBP query sends only the five-character SHA-1 prefix with padding", async () => {
  let capturedUrl = "";
  let capturedInit;

  const result = await checkPasswordExposure(password, {
    cryptoImpl: webcrypto,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return response(`FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1\n${knownSuffix}:3\n`);
    },
  });

  assert.equal(capturedUrl, `https://api.pwnedpasswords.com/range/${knownPrefix}`);
  assert.equal(capturedUrl.includes(knownFullHash), false);
  assert.equal(capturedUrl.includes(knownSuffix), false);
  assert.equal(capturedInit.headers["Add-Padding"], "true");
  assert.equal(capturedInit.cache, "no-store");
  assert.equal(capturedInit.credentials, "omit");
  assert.equal(capturedInit.referrerPolicy, "no-referrer");
  assert.equal(result.compromised, true);
  assert.equal(result.occurrences, 3);
});

test("a hash suffix absent from the returned range is not reported as breached", async () => {
  const result = await checkPasswordExposure(password, {
    cryptoImpl: webcrypto,
    fetchImpl: async () => response(`FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1\n`),
  });

  assert.deepEqual(result, { compromised: false, occurrences: 0 });
});

test("zero-count padding rows are discarded", async () => {
  const result = await checkPasswordExposure(password, {
    cryptoImpl: webcrypto,
    fetchImpl: async () => response(`${knownSuffix}:0\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1\n`),
  });

  assert.deepEqual(result, { compromised: false, occurrences: 0 });
});

test("a breached password is rejected at the final guard", async () => {
  await assert.rejects(
    () =>
      assertPasswordNotPwned(password, {
        cryptoImpl: webcrypto,
        fetchImpl: async () => response(`${knownSuffix}:42\n`),
      }),
    /apparaît dans des fuites de données connues/
  );
});

test("network errors fail closed with a safe, non-secret message", async () => {
  await assert.rejects(
    () =>
      checkPasswordExposure(password, {
        cryptoImpl: webcrypto,
        fetchImpl: async () => {
          throw new Error("private transport detail");
        },
      }),
    (error) => {
      assert.ok(error instanceof PwnedPasswordLookupError);
      assert.match(error.message, /vérification de sécurité est momentanément indisponible/);
      assert.equal(error.message.includes(password), false);
      return true;
    }
  );
});

test("HTTP and malformed responses fail closed", async () => {
  await assert.rejects(
    () =>
      checkPasswordExposure(password, {
        cryptoImpl: webcrypto,
        fetchImpl: async () => response("unavailable", 503),
      }),
    PwnedPasswordLookupError
  );

  await assert.rejects(
    () =>
      checkPasswordExposure(password, {
        cryptoImpl: webcrypto,
        fetchImpl: async () => response("not-a-hash-count\n"),
      }),
    PwnedPasswordLookupError
  );
});

test("all Jobly password creation and reset routes call the shared HIBP guard", () => {
  const home = readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const onboarding = readFileSync(path.join(root, "app/onboarding/page.tsx"), "utf8");
  const auth = readFileSync(path.join(root, "lib/auth.ts"), "utf8");

  assert.match(home, /assertPasswordNotPwned\(password\)/);
  assert.match(onboarding, /assertPasswordNotPwned\(password\)/);
  assert.match(auth, /await assertPasswordNotPwned\(password\)/);
  assert.match(auth, /export async function updatePassword/);
});
