import "./globals.css";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import PwaInit from "../components/PwaInit";

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

export const metadata: Metadata = {
  title: "JOBLY — J'IA, Intelligence Artificielle JOBLY",
  description: "Une intelligence qui travaille pour votre carrière.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`h-full w-full ${inter.variable} ${plusJakarta.variable}`}>
      <body className="h-[100dvh] w-screen m-0 p-0 overflow-x-hidden bg-white antialiased font-sans">
        <PwaInit />
        {children}
      </body>
    </html>
  );
}
