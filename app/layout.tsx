import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaInit from "../components/PwaInit";
import JiaObserver from "../components/JiaObserver";
import JiaPresence from "../components/JiaPresence";
import JiaTorchEffect from "../components/JiaTorchEffect";
import { ThemeProvider } from "../components/ThemeProvider";
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

// Apply the saved/system theme before the first paint to prevent a white flash.
const THEME_BOOTSTRAP = `try {
  const saved = localStorage.getItem("jobly:theme-mode");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved === "dark" || saved === "light" ? saved : (systemDark ? "dark" : "light");
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
} catch {
  document.documentElement.dataset.theme = "light";
}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full w-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body suppressHydrationWarning className="min-h-[100dvh] w-full m-0 p-0 overflow-x-hidden bg-white antialiased font-sans">
        <ThemeProvider>
          <LanguageProvider>
            <PwaInit />
            <JiaObserver />
            <JiaPresence />
            <JiaTorchEffect />
            <ScreenProtection />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
