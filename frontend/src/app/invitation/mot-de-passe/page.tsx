"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { PanioLogo } from "@/components/brand/PanioLogo";
import { ApiError, inspectSetPasswordToken, setPasswordWithToken, type SetPasswordInfo } from "@/lib/api";
import { PASSWORD_MIN_LENGTH, passwordRequirementHint, validatePassword } from "@/lib/password-policy";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [info, setInfo] = useState<SetPasswordInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Lien invalide.");
      setLoading(false);
      return;
    }

    inspectSetPasswordToken(token)
      .then(setInfo)
      .catch((err: unknown) => {
        setLoadError(err instanceof ApiError ? err.message : "Lien invalide ou expiré.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSubmitError(null);
    if (password !== confirmPassword) {
      setSubmitError("Les mots de passe ne correspondent pas.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setSubmitError(passwordError);
      return;
    }

    setSaving(true);
    try {
      const result = await setPasswordWithToken({ token, password, confirmPassword });
      setSuccess(result.message);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <PanioLogo size={88} priority />
      </div>

      {loading && <p className="text-center text-foreground/70">Vérification du lien…</p>}

      {!loading && loadError && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-700">Lien invalide</h1>
          <p className="mt-4 text-foreground/70">{loadError}</p>
          <Link href="/login" className="mt-8 inline-block font-medium text-primary hover:underline">
            Aller à la connexion
          </Link>
        </div>
      )}

      {!loading && !loadError && success && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Mot de passe créé</h1>
          <p className="mt-4 text-foreground/70">{success}</p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-light"
          >
            Se connecter
          </Link>
        </div>
      )}

      {!loading && !loadError && !success && info && (
        <>
          <h1 className="text-center text-2xl font-bold text-primary">Créez votre mot de passe</h1>
          <p className="mt-2 text-center text-sm text-foreground/65">
            Compte {info.roleLabel.toLowerCase()} · {info.email}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
            <p className="text-xs text-foreground/55">{passwordRequirementHint()}</p>

            <label className="block text-sm font-medium text-foreground/80">
              Mot de passe
              <input
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-foreground/80">
              Confirmer le mot de passe
              <input
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
              />
            </label>

            {submitError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Créer mon mot de passe"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function InvitationMotDePassePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <Suspense fallback={<p className="text-sm text-foreground/60">Chargement…</p>}>
        <SetPasswordContent />
      </Suspense>
    </main>
  );
}
