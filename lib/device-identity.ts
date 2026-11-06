const DEVICE_ID_KEY = "jobly-device-id-v1";

export function getJoblyDeviceId() {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && /^[A-Za-z0-9:_-]{1,160}$/.test(existing)) return existing;
    const created = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return `tab-${Math.random().toString(36).slice(2, 14)}`;
  }
}

export function getJoblyDeviceLabel() {
  if (typeof navigator === "undefined") return "Navigateur Web";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iPhone / iPad";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return "Navigateur Web";
}
