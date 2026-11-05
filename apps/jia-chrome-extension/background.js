const JOBLY_ORIGIN = "https://jobly-c0651.vercel.app";
chrome.runtime.onInstalled.addListener(() => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {}));
function isJoblySender(sender) {
  try { const host = new URL(sender.url || "").hostname; return host === "jobly-c0651.vercel.app" || host === "jobly-c0651-portfolio-5555.vercel.app"; }
  catch { return false; }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "JOBLY_SET_EXTERNAL_CONTEXT" && isJoblySender(sender)) {
    chrome.storage.session.set({ externalApplicationContext: message.payload || null }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, message: String(error) }));
    return true;
  }
  if (message?.type === "JOBLY_GET_EXTERNAL_CONTEXT" && isJoblySender(sender)) {
    chrome.storage.session.get(["externalApplicationContext"], (result) => sendResponse(result.externalApplicationContext || null));
    return true;
  }
  if (message?.type === "JOBLY_SAVE_FORM_FIELDS") {
    chrome.storage.session.get(["externalApplicationContext"], (result) => {
      const current = result.externalApplicationContext || {};
      chrome.storage.session.set({ externalApplicationContext: { ...current, formFields: Array.isArray(message.fields) ? message.fields.slice(0, 40) : [], inspectedPageUrl: message.pageUrl || "" } })
        .then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, message: String(error) }));
    });
    return true;
  }
  if (message?.type === "JOBLY_OPEN_JIA_ASSIST") {
    chrome.storage.session.get(["externalApplicationContext"], (result) => {
      const context = result.externalApplicationContext || {};
      if (!context.jobId || !["discovery", "recruiter"].includes(context.source)) { sendResponse({ ok: false, message: "Ouvre d’abord une offre Jobly puis son site promoteur." }); return; }
      const url = new URL("/jobs/" + encodeURIComponent(context.jobId), JOBLY_ORIGIN);
      url.searchParams.set("source", context.source);
      url.searchParams.set("jia_assist", "1");
      chrome.tabs.create({ url: url.toString() }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, message: String(error) }));
    });
    return true;
  }
});
