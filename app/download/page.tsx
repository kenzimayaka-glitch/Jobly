"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DownloadPage() {
  const router = useRouter();
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  }

  return (
    <main className="min-h-[100dvh] bg-[#F5F7FA] px-5 py-8 text-[#0B2447]">
      <div className="mx-auto max-w-lg">
        <div className="rounded-[32px] bg-[#081B36] p-7 text-white shadow-xl">
          <div className="font-black"><span className="text-[#174EA6]">JOB</span><span className="text-[#FFE135]">LY</span></div>
          <div className="mt-10 grid h-16 w-16 place-items-center rounded-2xl bg-[#FFE135] text-[#081B36]"><Smartphone size={28}/></div>
          <h1 className="mt-6 text-3xl font-black">Jobly, partout avec vous.</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">Installez Jobly sur votre téléphone pour retrouver rapidement vos opportunités, votre Career Brain et vos candidatures.</p>
          <div className="mt-6 space-y-3">
            {installEvent ? (
              <button onClick={install} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFE135] px-5 py-4 text-sm font-black text-[#081B36]"><Download size={18}/> Installer Jobly</button>
            ) : (
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-xs leading-5 text-white/75">
                {installed ? "Jobly est installé sur cet appareil." : "Sur Android/Chrome, ouvrez le menu du navigateur puis choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil »."}
              </div>
            )}
            <button onClick={()=>router.push("/")} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-4 text-sm font-black text-white">Ouvrir Jobly <ArrowRight size={17}/></button>
          </div>
        </div>
      </div>
    </main>
  );
}
