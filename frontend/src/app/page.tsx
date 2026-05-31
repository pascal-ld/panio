"use client";

import Link from "next/link";
import { PanioLogo } from "@/components/brand/PanioLogo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkApiHealth, fetchMe, type MeResponse } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { getHomePath, resolveAppRole } from "@/lib/roles";

export default function HomePage() {
  const router = useRouter();
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [user, setUser] = useState<MeResponse | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkApiHealth()
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setAuthChecked(true);
      return;
    }

    fetchMe()
      .then((me) => {
        const role = resolveAppRole(me);
        if (role !== "visitor") {
          router.replace(getHomePath(role));
          return;
        }
        setUser(me);
      })
      .catch(() => clearToken())
      .finally(() => setAuthChecked(true));
  }, [router]);

  if (!authChecked) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-foreground/60">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <header className="text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <PanioLogo size={96} priority />
        </div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary-light">
          Bienvenue
        </p>
        <h1 className="mt-2 text-4xl font-bold text-primary">Panio</h1>
        <p className="mt-3 max-w-sm text-foreground/70">
          Paniers maraîchers — connectez-vous selon votre profil.
        </p>
      </header>

      {!user && (
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="min-h-12 rounded-xl bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary-light"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="text-sm font-medium text-primary hover:underline"
          >
            Créer un compte
          </Link>
        </div>
      )}

      <section
        className="w-full max-w-md rounded-2xl border border-primary/15 bg-white p-6 shadow-sm"
        aria-live="polite"
      >
        <h2 className="text-sm font-semibold text-foreground/60">État de l&apos;API</h2>
        <p className="mt-2 text-lg font-medium">
          {apiStatus === "loading" && "Connexion…"}
          {apiStatus === "ok" && "API disponible"}
          {apiStatus === "error" && "API indisponible"}
        </p>
      </section>
    </main>
  );
}
