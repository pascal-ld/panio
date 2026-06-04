"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallMode = "native-prompt" | "ios-manual" | "android-manual" | "hidden";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  return /firefox/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function resolveInstallMode(hasNativePrompt: boolean): InstallMode {
  if (isStandalone()) return "hidden";
  if (hasNativePrompt) return "native-prompt";
  if (isIos()) return "ios-manual";
  if (isAndroid()) return "android-manual";
  return "hidden";
}

function installHint(mode: InstallMode): string | null {
  if (mode === "ios-manual") {
    return "Sur iPhone : touchez Partager puis Sur l’écran d’accueil.";
  }
  if (mode === "android-manual" && isFirefox()) {
    return "Sur Firefox : menu ⋮ → Installer ou Ajouter à l’écran d’accueil.";
  }
  if (mode === "android-manual") {
    return "Sur Android : menu du navigateur (⋮) → Installer l’application ou Ajouter à l’écran d’accueil. Avec Chrome, le bouton peut aussi proposer l’installation directement.";
  }
  return null;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  const mode = resolveInstallMode(deferredPrompt !== null);
  const hint = installHint(mode);

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
      setShowHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || mode === "hidden") {
    return null;
  }

  async function handleInstallClick() {
    if (mode === "native-prompt" && deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    setShowHint((prev) => !prev);
  }

  const buttonLabel =
    mode === "native-prompt" ? "Installer l’application" : "Ajouter Panio à l’écran d’accueil";

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={handleInstallClick}
        className="min-h-12 w-full rounded-xl border border-primary/25 bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-accent/60"
      >
        {buttonLabel}
      </button>

      {showHint && hint && (
        <p className="mt-3 rounded-xl border border-primary/15 bg-accent/40 px-4 py-3 text-sm leading-relaxed text-foreground/75">
          {hint}
        </p>
      )}
    </div>
  );
}
