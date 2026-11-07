const JOBLY_HOSTS = new Set([
  "jobly-c0651.vercel.app",
  "jobly-c0651-portfolio-5555.vercel.app"
]);

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const stored = await chrome.storage.local.get(["assistantEnabled"]);
    if (typeof stored.assistantEnabled !== "boolean") {
      await chrome.storage.local.set({ assistantEnabled: false });
    }
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("Jobly J'IA initialization failed", error);
  }
});

function isJoblySender(sender) {
  try {
    return JOBLY_HOSTS.has(new URL(sender.url || "").hostname);
  } catch {
    return false;
  }
}

function isExtensionMessage(sender) {
  return sender.id === chrome.runtime.id;
}

async function getInstallStatus() {
  const stored = await chrome.storage.local.get(["assistantEnabled"]);
  return {
    installed: true,
    enabled: stored.assistantEnabled === true,
    version: chrome.runtime.getManifest().version,
    sidePanelAvailable: Boolean(chrome.sidePanel),
    minChromeVersion: Number(chrome.runtime.getManifest().minimum_chrome_version || 116)
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionMessage(sender)) return false;

  if (message?.type === "JOBLY_GET_INSTALL_STATUS") {
    getInstallStatus()
      .then((status) => sendResponse({ ok: true, status }))
      .catch((error) => sendResponse({ ok: false, message: String(error) }));
    return true;
  }

  if (message?.type === "JOBLY_SET_ASSISTANT_ENABLED") {
    if (!isJoblySender(sender) && !sender.url?.startsWith(chrome.runtime.getURL(""))) {
      sendResponse({ ok: false, message: "Source non autorisée." });
      return false;
    }
    const enabled = message.enabled === true;
    chrome.storage.local.set({ assistantEnabled: enabled })
      .then(async () => {
        if (!enabled) {
          const stored = await chrome.storage.session.get(["externalApplicationContext"]);
          const context = stored.externalApplicationContext;
          if (context && typeof context === "object") {
            await chrome.storage.session.set({
              externalApplicationContext: { ...context, formFields: [], inspectedPageUrl: "" }
            });
          }
        }
        return getInstallStatus();
      })
      .then((status) => sendResponse({ ok: true, status }))
      .catch((error) => sendResponse({ ok: false, message: String(error) }));
    return true;
  }

  if (message?.type === "JOBLY_SET_EXTERNAL_CONTEXT" && isJoblySender(sender)) {
    chrome.storage.local.get(["assistantEnabled"], (stored) => {
      if (stored.assistantEnabled !== true) {
        sendResponse({ ok: false, message: "J'IA est en pause." });
        return;
      }
      chrome.storage.session.set({ externalApplicationContext: message.payload || null })
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, message: String(error) }));
    });
    return true;
  }

  if (message?.type === "JOBLY_GET_EXTERNAL_CONTEXT") {
    chrome.storage.session.get(["externalApplicationContext"], (result) => sendResponse(result.externalApplicationContext || null));
    return true;
  }

  if (message?.type === "JOBLY_SAVE_FORM_FIELDS" && sender.url?.startsWith(chrome.runtime.getURL(""))) {
    chrome.storage.session.get(["externalApplicationContext"], (result) => {
      const current = result.externalApplicationContext || {};
      const fields = Array.isArray(message.fields) ? message.fields.slice(0, 40) : [];
      chrome.storage.session.set({
        externalApplicationContext: {
          ...current,
          formFields: fields,
          inspectedPageUrl: typeof message.pageUrl === "string" ? message.pageUrl.slice(0, 2000) : ""
        }
      })
        .then(() => sendResponse({ ok: true, count: fields.length }))
        .catch((error) => sendResponse({ ok: false, message: String(error) }));
    });
    return true;
  }

  if (message?.type === "JOBLY_OPEN_JIA_ASSIST") {
    chrome.storage.local.get(["assistantEnabled"], async (stored) => {
      if (stored.assistantEnabled !== true) {
        sendResponse({ ok: false, message: "J'IA est en pause. Active d’abord l’assistant depuis Jobly." });
        return;
      }
      chrome.storage.session.get(["externalApplicationContext"], (result) => {
        const context = result.externalApplicationContext || {};
        if (!context.jobId || !["discovery", "recruiter"].includes(context.source)) {
          sendResponse({ ok: false, message: "Ouvre d’abord une offre Jobly puis son site promoteur." });
          return;
        }
        const url = new URL("/jobs/" + encodeURIComponent(context.jobId), "https://jobly-c0651.vercel.app");
        url.searchParams.set("source", context.source);
        url.searchParams.set("jia_assist", "1");
        chrome.tabs.create({ url: url.toString() })
          .then(() => sendResponse({ ok: true }))
          .catch((error) => sendResponse({ ok: false, message: String(error) }));
      });
    });
    return true;
  }

  return false;
});
