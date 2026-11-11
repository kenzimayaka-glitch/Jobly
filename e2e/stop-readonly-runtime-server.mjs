import { spawnSync } from "node:child_process";
import { readFile, unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const artifacts = path.join(root, "artifacts", "e2e");
const pidPath = path.join(artifacts, "parallel-runtime-server.pid.json");
const reportPath = path.join(artifacts, "parallel-runtime-server-stop.json");

async function main() {
  const meta = JSON.parse(await readFile(pidPath, "utf8"));
  if (meta.environment !== "JOBLY-E2E" || meta.projectRef !== "ofqqrryamslxoqkklraw" ||
      meta.baseURL !== "http://127.0.0.1:3217" || !Number.isInteger(meta.pid) || meta.pid <= 0) {
    throw new Error("SERVER_PID_FILE_INVALID_REFUSED");
  }
  const listed = spawnSync("tasklist", ["/FI", "PID eq " + meta.pid, "/FO", "CSV", "/NH"], {
    encoding: "utf8", windowsHide: true,
  });
  const processLine = String(listed.stdout || "").toLowerCase();
  const exactPidVisible = processLine.includes('"' + meta.pid + '"');
  const nodeProcess = processLine.includes('"node.exe"');
  if (!exactPidVisible) {
    await unlink(pidPath).catch(() => undefined);
    console.log("Serveur déjà arrêté ; PID local périmé supprimé.");
    return;
  }
  if (!nodeProcess) throw new Error("PID_OCCUPE_PAR_UN_AUTRE_EXECUTABLE_REFUSED");

  const health = await fetch(meta.baseURL + "/api/profile", {
    cache: "no-store", signal: AbortSignal.timeout(3000),
  }).catch(() => null);
  if (!health || health.status !== 401) {
    await health?.body?.cancel().catch(() => undefined);
    throw new Error("SERVER_HEALTH_NOT_EXPECTED_401_REFUSE_TO_KILL");
  }
  await health.body?.cancel().catch(() => undefined);

  const killed = spawnSync("taskkill", ["/PID", String(meta.pid), "/T", "/F"], {
    encoding: "utf8", windowsHide: true,
  });
  if (killed.status !== 0) throw new Error("TASKKILL_FAILED_FOR_RECORDED_SERVER_PID");
  await unlink(pidPath).catch(() => undefined);
  const report = {
    createdAt: new Date().toISOString(),
    status: "STOPPED",
    environment: "JOBLY-E2E",
    projectRef: meta.projectRef,
    port: meta.port,
    commit: meta.commit,
    pid: meta.pid,
    stopped: true,
  };
  await mkdir(artifacts, { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("ARRÊT REFUSÉ : " + (error instanceof Error ? error.message : "STOP_FAILED"));
  process.exitCode = 1;
});
