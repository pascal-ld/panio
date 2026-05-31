"use client";

import { FormEvent, useState } from "react";
import { changeMyPassword } from "@/lib/api";
import {
  PASSWORD_MIN_LENGTH,
  passwordRequirementHint,
  validatePassword,
} from "@/lib/password-policy";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";
const buttonPrimaryClass =
  "rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-50";

export function ChangePasswordForm({ submitLabel = "Mettre à jour" }: { submitLabel?: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSaving(true);
    try {
      const result = await changeMyPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccess(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-foreground/55">{passwordRequirementHint()}</p>
      <label className={labelClass}>
        Mot de passe actuel
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Nouveau mot de passe
        <input
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Confirmer le nouveau mot de passe
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

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p>
      )}

      <button type="submit" disabled={saving} className={buttonPrimaryClass}>
        {saving ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  );
}
