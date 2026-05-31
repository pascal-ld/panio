"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PanioLogo } from "@/components/brand/PanioLogo";
import { ApiError, verifyEmail } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien de confirmation invalide.");
      return;
    }

    verifyEmail(token)
      .then((result) => {
        setStatus("success");
        setMessage(result.message);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Lien de confirmation invalide.");
      });
  }, [token]);

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex justify-center">
        <PanioLogo size={88} priority />
      </div>

      {status === "loading" && (
        <p className="text-foreground/70">Activation de votre compte en cours…</p>
      )}

      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold text-primary">Compte activé</h1>
          <p className="mt-4 text-foreground/70">{message}</p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-light"
          >
            Se connecter
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-red-700">Échec de l&apos;activation</h1>
          <p className="mt-4 text-foreground/70">{message}</p>
          <Link
            href="/inscription"
            className="mt-8 inline-block font-medium text-primary hover:underline"
          >
            Créer un nouveau compte
          </Link>
        </>
      )}
    </div>
  );
}

export default function InscriptionValiderPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <Suspense
        fallback={
          <p className="text-sm text-foreground/60">Chargement…</p>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
