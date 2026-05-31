"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { fetchClientProfile, updateClientProfile } from "@/lib/client-api";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3.5 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";

export default function ClientProfilePage() {
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchClientProfile()
      .then((profile) => {
        setFullName(profile.fullName ?? "");
        setEmail(profile.email);
        setPhone(profile.phone ?? "");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      await updateClientProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      await refresh();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoader size="sm" />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-semibold text-primary">Mon profil</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Vos coordonnées pour les commandes et la communication avec les producteurs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className={labelClass}>
          Nom *
          <input
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Prénom et nom"
          />
        </label>

        <label className={labelClass}>
          E-mail *
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="vous@exemple.fr"
          />
        </label>

        <label className={labelClass}>
          Téléphone
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="06 12 34 56 78"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl bg-accent px-4 py-3 text-sm text-primary" role="status">
            Profil enregistré.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      <section className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-primary">Mot de passe</h3>
        <p className="mt-1 text-sm text-foreground/60">
          Changez votre mot de passe de connexion. L&apos;ancien mot de passe est requis.
        </p>
        <div className="mt-4">
          <ChangePasswordForm submitLabel="Changer le mot de passe" />
        </div>
      </section>
    </div>
  );
}
