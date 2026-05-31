"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PanioLogo } from "@/components/brand/PanioLogo";
import { ApiError, register } from "@/lib/api";
import { PASSWORD_MIN_LENGTH, passwordRequirementHint, validatePassword } from "@/lib/password-policy";

export default function InscriptionPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (fullName.trim() === "") {
      setError("Le nom est obligatoire.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      router.push("/inscription/merci");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
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
            Inscription
          </p>
          <h1 className="mt-2 text-3xl font-bold text-primary">Créer un compte</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Renseignez vos coordonnées. Un e-mail de confirmation vous sera envoyé.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-primary/15 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground/80">Nom</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/20 px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Marie Dupont"
              />
            </label>

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
              <span className="text-sm font-medium text-foreground/80">Téléphone</span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/20 px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="06 12 34 56 78"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground/80">Mot de passe</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/20 px-3 py-2.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="mt-1 block text-xs text-foreground/50">{passwordRequirementHint()}</span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground/80">
                Confirmer le mot de passe
              </span>
              <input
                type="password"
                name="passwordConfirm"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
            {loading ? "Envoi…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
