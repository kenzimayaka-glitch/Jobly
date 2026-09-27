import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaInit from "../components/PwaInit";
import JiaObserver from "../components/JiaObserver";

import ScreenProtection from "../components/ScreenProtection";
import { LanguageProvider } from "../lib/i18n";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "JOBLY — J'IA, Intelligence Artificielle JOBLY",
  description: "Une intelligence qui travaille pour votre carrière.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full w-full">
      <body className="h-[100dvh] w-screen m-0 p-0 overflow-visible bg-white antialiased font-sans">
        <LanguageProvider>
          <PwaInit />
          <JiaObserver />
          <ScreenProtection />
          {children}
                </LanguageProvider>
      </body>
    </html>
  );
}
