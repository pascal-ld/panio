"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return null;
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    if (isIos()) {
      setShowIosHint((prev) => !prev);
    }
  }

  const canShowAndroidInstall = deferredPrompt !== null;
  const canShowIosHelp = isIos() && !deferredPrompt;

  if (!canShowAndroidInstall && !canShowIosHelp) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={handleInstallClick}
        className="min-h-12 w-full rounded-xl border border-primary/25 bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-accent/60"
      >
        {canShowAndroidInstall ? "Installer l’application" : "Ajouter Panio à l’écran d’accueil"}
      </button>

      {showIosHint && canShowIosHelp && (
        <p className="mt-3 rounded-xl border border-primary/15 bg-accent/40 px-4 py-3 text-sm text-foreground/75">
          Sur iPhone : touchez{" "}
          <span className="font-semibold text-primary">Partager</span> puis{" "}
          <span className="font-semibold text-primary">Sur l&apos;écran d&apos;accueil</span>.
        </p>
      )}
    </div>
  );
}
