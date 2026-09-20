import "./globals.css";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import PwaInit from "../components/PwaInit";
import JiaObserver from "../components/JiaObserver";
import JiaGlobal from "../components/JiaGlobal";
import ScreenProtection from "../components/ScreenProtection";
import LanguageSync from "../components/LanguageSync";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JOBLY — J'IA, Intelligence Artificielle JOBLY",
  description: "Une intelligence qui travaille pour votre carrière.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`h-full w-full ${inter.variable} ${plusJakarta.variable} ${poppins.variable}`}>
      <body className="h-[100dvh] w-screen m-0 p-0 overflow-visible bg-white antialiased font-sans">
        <LanguageSync />
        <PwaInit />
        <JiaObserver />
        <JiaGlobal />
        <ScreenProtection />
        {children}
      </body>
    </html>
  );
}
