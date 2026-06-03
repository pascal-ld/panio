"use client";

import Link from "next/link";
import { PanioLogo } from "@/components/brand/PanioLogo";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe, type MeResponse } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { getHomePath, resolveAppRole } from "@/lib/roles";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
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

      <InstallAppButton />

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
    </main>
  );
}
