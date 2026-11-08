import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const secretNames = ["SUPABASE_E2E_SECRET_KEY", "SUPABASE_SECRET_KEY"];
const serviceNames = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"];
const names = [...secretNames, ...serviceNames];
const anonNames = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"];
const reportPath = path.resolve("feedback-lot00-storage-credential-diagnostic.txt");

function parseEnvValue(raw) {
  const value = raw.trim();
  if (!value) return "";
  const quote = value[0];
  if (quote === "'" || quote === '"' || quote === "\`") {
    const end = value.lastIndexOf(quote);
    if (end > 0) {
      const inner = value.slice(1, end);
      return quote === '"'
        ? inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
        : inner;
    }
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function decodeJwtClaims(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { jwtShapeValid: false, projectMatches: false, serviceRole: false };
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return {
      jwtShapeValid: true,
      projectMatches: claims.ref === "ofqqrryamslxoqkklraw",
      serviceRole: claims.role === "service_role",
    };
  } catch {
    return { jwtShapeValid: false, projectMatches: false, serviceRole: false };
  }
}

const root = process.cwd();
const fileResults = {};
const fileValues = new Map();
for (const filename of [".env", ".env.local"]) {
  const fullPath = path.join(root, filename);
  const exists = existsSync(fullPath);
  const found = {};
  const allNames = [...names, ...anonNames];
  const counts = Object.fromEntries(allNames.map((name) => [name, 0]));
  const parsedInThisFile = new Map();
  if (exists) {
    const source = readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || !allNames.includes(match[1])) continue;
      counts[match[1]] += 1;
      const parsed = parseEnvValue(match[2]);
      parsedInThisFile.set(match[1], parsed);
      fileValues.set(match[1], parsed);
    }
  }
  for (const name of allNames) {
    const value = parsedInThisFile.get(name);
    found[name] = {
      assignmentCount: counts[name],
      parsedNonEmpty: typeof value === "string" && value.length > 0,
    };
  }
  fileResults[filename] = { exists, variables: found };
}

// Match the storage script's precedence: .env.local over .env; an already
// defined process variable (even an empty string) takes precedence over files.
const effective = {};
for (const name of [...names, ...anonNames]) {
  const processDefined = typeof process.env[name] !== "undefined";
  const processNonEmpty = Boolean(process.env[name]);
  const fileValue = fileValues.get(name) ?? "";
  const value = processDefined && process.env[name] ? process.env[name] : fileValue;
  effective[name] = {
    processVariableDefined: processDefined,
    processVariableNonEmpty: processNonEmpty,
    fileAssignmentParsedNonEmpty: Boolean(fileValue),
    effectiveValueAvailable: Boolean(value),
  };
}

const effectiveValue = (name) => {
  if (!effective[name]?.effectiveValueAvailable) return "";
  return process.env[name]
    ? process.env[name]
    : (fileValues.get(name) ?? "");
};
const secretKey = secretNames.map(effectiveValue).find(Boolean) ?? "";
const serviceRoleKey = serviceNames.map(effectiveValue).find(Boolean) ?? "";
const selectedKey = secretKey || serviceRoleKey;
let keyValidation = { keySelected: Boolean(selectedKey), acceptedFormat: false, jwtShapeValid: null, projectMatches: null, serviceRole: null };
if (selectedKey.startsWith("eyJ")) {
  const claims = decodeJwtClaims(selectedKey);
  keyValidation = {
    keySelected: true,
    acceptedFormat: true,
    ...claims,
  };
} else if (selectedKey) {
  keyValidation = {
    keySelected: true,
    acceptedFormat: selectedKey.startsWith("sb_secret_"),
    jwtShapeValid: null,
    projectMatches: null,
    serviceRole: null,
  };
}

const anonValue = anonNames.map((name) => {
  if (typeof process.env[name] !== "undefined" && process.env[name]) return process.env[name];
  return fileValues.get(name) ?? "";
}).find(Boolean) ?? "";
const anonKeyPresent = Boolean(anonValue);

const report = {
  checkedAt: new Date().toISOString(),
  workingDirectory: root,
  expectedRepositoryDirectory: "C:\\Users\\ASUS\\Jobly",
  expectedDirectoryMatches: path.resolve(root).toLowerCase() === path.resolve("C:\\Users\\ASUS\\Jobly").toLowerCase(),
  files: fileResults,
  effectiveVariables: effective,
  anonPublicKeyAvailableForAnonymousReadCheck: anonKeyPresent || true,
  anonPublicKeySource: anonKeyPresent ? "local_environment" : "known_JOBLY_E2E_publishable_key",
  keyValidation,
  credentials: "not included",
};

const output = JSON.stringify(report, null, 2) + "\n";
writeFileSync(reportPath, output, "utf8");
process.stdout.write(output);
