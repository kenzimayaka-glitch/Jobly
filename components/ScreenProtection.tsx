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
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("selectstart", prevent);
      window.removeEventListener("keydown", keydown);
    };
  }, [pathname]);

  return null;
}
