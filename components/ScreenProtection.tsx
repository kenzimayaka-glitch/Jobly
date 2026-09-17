"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScreenProtection() {
  const pathname = usePathname();

  useEffect(() => {
    // QR/pass pages remain capturable by design so a user can scan/share a QR.
    const qrAllowed = pathname.startsWith("/pass") || pathname.startsWith("/jobly-id");
    if (qrAllowed) return;

    const previous = document.body.getAttribute("data-screen-protected");
    document.body.setAttribute("data-screen-protected", "true");
    const style = document.createElement("style");
    style.dataset.joblyScreenProtection = "true";
    style.textContent = `
      body[data-screen-protected="true"] * { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }
      body[data-screen-protected="true"] input, body[data-screen-protected="true"] textarea { -webkit-user-select: text !important; user-select: text !important; }
      @media print { body[data-screen-protected="true"] { display: none !important; } }
    `;
    document.head.appendChild(style);

    const prevent = (event: Event) => event.preventDefault();
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked = key === "printscreen" ||
        (event.ctrlKey && event.shiftKey && ["s", "i"].includes(key)) ||
        (event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key));
      if (blocked) event.preventDefault();
    };

    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("selectstart", prevent);
    window.addEventListener("keydown", keydown);

    return () => {
      if (previous === null) document.body.removeAttribute("data-screen-protected");
      else document.body.setAttribute("data-screen-protected", previous);
      style.remove();
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("selectstart", prevent);
      window.removeEventListener("keydown", keydown);
    };
  }, [pathname]);

  return null;
}
