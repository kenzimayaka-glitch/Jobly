import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaInit from "../components/PwaInit";
import OfflineCoordinator from "../components/OfflineCoordinator";
import JiaObserver from "../components/JiaObserver";
import JiaPresence from "../components/JiaPresence";

import ScreenProtection from "../components/ScreenProtection";
import { LanguageProvider } from "../lib/i18n";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "JOBLY — Your Career OS",
  description: "Your Career OS, powered by J'IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full w-full">
      <body className="min-h-[100dvh] w-full m-0 p-0 overflow-x-hidden bg-white antialiased font-sans">
        <LanguageProvider>
          <PwaInit />
          <OfflineCoordinator />
          <JiaObserver />
          <JiaPresence />
          <ScreenProtection />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
