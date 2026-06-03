"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { OrganicBadge } from "@/components/producer/OrganicBadge";
import { ProducerPhoto } from "@/components/producer/ProducerPhoto";
import { DistributionPointCard } from "@/components/producteur/DistributionPointCard";
import { getPhotoUrl } from "@/lib/producteur-api";
import {
  emptyDistributionPoint,
  fetchProducerSettings,
  fetchWeekdays,
  updateProducerProfile,
  type DistributionPointData,
  type WeekdayOption,
} from "@/lib/producteur-settings-api";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";

type PointEntry = {
  clientKey: string;
  point: DistributionPointData;
  defaultOpen?: boolean;
};

function newClientKey(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return `draft-${globalThis.crypto.randomUUID()}`;
  }

  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ProducteurSettingsPage() {
  const [weekdays, setWeekdays] = useState<WeekdayOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [advanceBookingDays, setAdvanceBookingDays] = useState(10);
  const [producerPhotoPath, setProducerPhotoPath] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [producerOrganic, setProducerOrganic] = useState(false);
  const [producerDescription, setProducerDescription] = useState("");
  const [pointEntries, setPointEntries] = useState<PointEntry[]>([]);

  const loadSettings = useCallback(async () => {
    const settings = await fetchProducerSettings();
    setFullName(settings.fullName ?? "");
    setPhone(settings.phone ?? "");
    setEmail(settings.email);
    setSlug(settings.slug ?? "");
    setAdvanceBookingDays(settings.advanceBookingDays ?? 10);
    setProducerPhotoPath(settings.producerPhotoPath);
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoPreview(getPhotoUrl(settings.producerPhotoPath));
    setProducerOrganic(settings.producerOrganic ?? false);
    setProducerDescription(settings.producerDescription ?? "");
    setPointEntries(
      settings.distributionPoints.map((point) => ({
        clientKey: `id-${point.id}`,
        point,
      })),
    );
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), fetchWeekdays()])
      .then(([, days]) => setWeekdays(days))
      .catch((err: Error) => setProfileError(err.message))
      .finally(() => setLoading(false));
  }, [loadSettings]);

  function addPoint() {
    setPointEntries((prev) => [
      ...prev,
      {
        clientKey: newClientKey(),
        point: emptyDistributionPoint(),
        defaultOpen: true,
      },
    ]);
  }

  function handlePointSaved(saved: DistributionPointData, previousClientKey: string) {
    setPointEntries((prev) =>
      prev.map((entry) =>
        entry.clientKey === previousClientKey
          ? { clientKey: `id-${saved.id}`, point: saved, defaultOpen: false }
          : entry,
      ),
    );
  }

  function handlePointDeleted(clientKey: string) {
    setPointEntries((prev) => prev.filter((entry) => entry.clientKey !== clientKey));
  }

  function handlePhotoChange(file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setProfileError("La photo ne doit pas dépasser 10 Mo.");
      return;
    }
    setProfileError(null);
    setRemovePhoto(false);
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    setProducerPhotoPath(null);
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);

    try {
      const updated = await updateProducerProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        slug: slug.trim(),
        advanceBookingDays,
        producerOrganic,
        producerDescription: producerDescription.trim(),
        photo: photoFile,
        removePhoto,
      });
      setSlug(updated.slug ?? slug);
      setAdvanceBookingDays(updated.advanceBookingDays);
      setProducerPhotoPath(updated.producerPhotoPath);
      setPhotoFile(null);
      setRemovePhoto(false);
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(getPhotoUrl(updated.producerPhotoPath));
      setProducerOrganic(updated.producerOrganic ?? false);
      setProducerDescription(updated.producerDescription ?? "");
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setProfileSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="text-xl font-semibold text-primary">Paramètres</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Votre profil et vos lieux de distribution pour les clients.
        </p>
      </div>

      <form
        onSubmit={handleProfileSubmit}
        className="space-y-4 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
      >
        <h3 className="font-semibold text-primary">Profil</h3>

        <label className={labelClass}>
          Nom et prénom *
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Ex. Marie Dupont"
            autoComplete="name"
          />
        </label>

        <label className={labelClass}>
          Téléphone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
          />
        </label>

        <label className={labelClass}>
          E-mail *
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </label>

        <label className={labelClass}>
          Lien stand (slug)
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputClass}
            placeholder="marie-dupont"
            pattern="[a-z0-9-]+"
          />
          <span className="mt-1 block text-xs text-foreground/50">
            URL clients : /producteur/{slug || "votre-slug"}
          </span>
        </label>

        <div>
          <span className={labelClass}>Photo ou logo (facultatif)</span>
          <input
            id="producer-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => {
              handlePhotoChange(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="producer-photo"
            className="mt-1.5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/25 bg-white px-4 py-6 transition hover:border-primary/40 hover:bg-accent/30"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Aperçu photo producteur"
                className="max-h-32 max-w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ProducerPhoto photoPath={producerPhotoPath} size={64} />
                <span className="text-center text-sm text-foreground/55">
                  JPEG, PNG ou WebP — max. 10 Mo
                </span>
              </div>
            )}
          </label>
          {photoFile && (
            <p className="mt-1 text-xs text-foreground/50">
              Fichier : {photoFile.name} ({(photoFile.size / 1024).toFixed(0)} Ko)
            </p>
          )}
          {(photoPreview || producerPhotoPath) && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="mt-2 text-sm text-red-700 underline"
            >
              Supprimer la photo
            </button>
          )}
          {!photoFile && producerPhotoPath && !removePhoto && (
            <p className="mt-1 text-xs text-foreground/50">
              La photo actuelle est conservée si vous n&apos;en choisissez pas une nouvelle.
            </p>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
          <input
            type="checkbox"
            checked={producerOrganic}
            onChange={(e) => setProducerOrganic(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/30"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground/80">Production biologique</span>
              {producerOrganic && <OrganicBadge height={24} />}
            </span>
            <span className="mt-1 block text-xs text-foreground/55">
              Cochez si votre production est certifiée agriculture biologique (marque AB).
            </span>
          </span>
        </label>

        <label className={labelClass}>
          Petite description (facultative)
          <textarea
            value={producerDescription}
            onChange={(e) => setProducerDescription(e.target.value)}
            className={`${inputClass} min-h-24 resize-y`}
            maxLength={500}
            placeholder="Présentez rapidement votre ferme et vos produits."
          />
          <span className="mt-1 block text-xs text-foreground/50">
            {producerDescription.trim().length}/500 caractères
          </span>
        </label>

        <label className={labelClass}>
          Réservation à l&apos;avance (jours)
          <input
            type="number"
            min={1}
            max={60}
            required
            value={advanceBookingDays}
            onChange={(e) => setAdvanceBookingDays(Number.parseInt(e.target.value, 10) || 10)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-foreground/50">
            Nombre de jours proposés au client pour choisir sa collecte.
          </span>
        </label>

        {profileError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {profileError}
          </p>
        )}
        {profileSuccess && (
          <p className="rounded-lg bg-accent px-3 py-2 text-sm text-primary" role="status">
            Profil enregistré.
          </p>
        )}

        <button
          type="submit"
          disabled={profileSaving}
          className="min-h-12 w-full rounded-xl bg-primary font-semibold text-white disabled:opacity-60"
        >
          {profileSaving ? "Enregistrement…" : "Enregistrer le profil"}
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-primary">Lieux de distribution</h3>
          <button
            type="button"
            onClick={addPoint}
            className="shrink-0 rounded-lg border border-primary/25 px-3 py-2 text-sm font-semibold text-primary"
          >
            + Ajouter
          </button>
        </div>

        {pointEntries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-primary/20 bg-white/80 p-6 text-center text-sm text-foreground/55">
            Aucun lieu renseigné. Ajoutez un marché, un point de retrait ou une tournée.
          </p>
        )}

        {pointEntries.map((entry) => (
          <DistributionPointCard
            key={entry.clientKey}
            clientKey={entry.clientKey}
            point={entry.point}
            weekdays={weekdays}
            defaultOpen={entry.defaultOpen}
            onSaved={handlePointSaved}
            onDeleted={handlePointDeleted}
          />
        ))}
      </section>

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
