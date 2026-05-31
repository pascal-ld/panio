"use client";

import Link from "next/link";
import { PanioLogo } from "@/components/brand/PanioLogo";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, fetchMe, login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { getHomePath, resolveAppRole } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token } = await login(email.trim(), password);
      setToken(token);
      const me = await fetchMe();
      router.push(getHomePath(resolveAppRole(me)));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "E-mail ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <PanioLogo size={88} priority />
          </div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary-light">
            Connexion
          </p>
          <h1 className="mt-2 text-3xl font-bold text-primary">Panio</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Accédez à votre espace client, producteur ou administration.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-primary/15 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground/80">E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/20 px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="vous@exemple.fr"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground/80">Mot de passe</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/20 px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-foreground/60">
          <Link href="/" className="font-medium text-primary hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
