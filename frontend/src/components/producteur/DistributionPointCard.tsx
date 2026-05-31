"use client";

import { useState } from "react";
import {
  createDistributionPoint,
  deleteDistributionPoint,
  getDayLabel,
  updateDistributionPoint,
  type DistributionPointData,
  type WeekdayOption,
} from "@/lib/producteur-settings-api";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";

type DistributionPointCardProps = {
  point: DistributionPointData;
  clientKey: string;
  weekdays: WeekdayOption[];
  defaultOpen?: boolean;
  onSaved: (saved: DistributionPointData, previousClientKey: string) => void;
  onDeleted: (clientKey: string) => void;
};

export function DistributionPointCard({
  point: initialPoint,
  clientKey,
  weekdays,
  defaultOpen = false,
  onSaved,
  onDeleted,
}: DistributionPointCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [point, setPoint] = useState(initialPoint);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const isNew = point.id === undefined;
  const summaryTitle = point.locationLabel.trim() || "Nouveau lieu";
  const summaryDay = getDayLabel(point.distributionDay, weekdays);

  function patch(patch: Partial<DistributionPointData>) {
    setPoint((prev) => ({ ...prev, ...patch }));
    setSavedFlash(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    try {
      const payload: DistributionPointData = {
        locationLabel: point.locationLabel.trim(),
        distributionDay: point.distributionDay,
        distributionStartTime: point.distributionStartTime,
        distributionEndTime: point.distributionEndTime,
        orderDeadlineDay: point.orderDeadlineDay,
        orderDeadlineTime: point.orderDeadlineTime,
        maxBaskets: point.maxBaskets ?? null,
      };

      const saved = point.id
        ? await updateDistributionPoint(point.id, payload)
        : await createDistributionPoint(payload);

      setPoint(saved);
      setSavedFlash(true);
      setOpen(false);
      onSaved(saved, clientKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!point.id) {
      onDeleted(clientKey);
      return;
    }

    if (!window.confirm(`Supprimer le lieu « ${summaryTitle} » ?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteDistributionPoint(point.id);
      onDeleted(clientKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
      setDeleting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold text-primary transition-transform ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground">{summaryTitle}</span>
          <span className="block text-sm text-foreground/55">{summaryDay}</span>
        </span>
        {savedFlash && !open && (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
            Enregistré
          </span>
        )}
        {isNew && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            Non enregistré
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-4 border-t border-primary/10 px-4 pb-4 pt-4">
          <label className={labelClass}>
            Nom du lieu *
            <input
              type="text"
              required
              value={point.locationLabel}
              onChange={(e) => patch({ locationLabel: e.target.value })}
              className={inputClass}
              placeholder="Ex. Marché de la Gare"
            />
          </label>

          <label className={labelClass}>
            Jour de distribution *
            <select
              required
              value={point.distributionDay}
              onChange={(e) => patch({ distributionDay: e.target.value })}
              className={inputClass}
            >
              {weekdays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Début *
              <input
                type="time"
                required
                value={point.distributionStartTime}
                onChange={(e) => patch({ distributionStartTime: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Fin *
              <input
                type="time"
                required
                value={point.distributionEndTime}
                onChange={(e) => patch({ distributionEndTime: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className={labelClass}>
            Jour limite de commande *
            <select
              required
              value={point.orderDeadlineDay}
              onChange={(e) => patch({ orderDeadlineDay: e.target.value })}
              className={inputClass}
            >
              {weekdays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Limiter le nombre de paniers (optionnel)
            <input
              type="number"
              min={1}
              max={500}
              value={point.maxBaskets ?? ""}
              onChange={(e) =>
                patch({
                  maxBaskets: e.target.value === "" ? null : Number.parseInt(e.target.value, 10) || null,
                })
              }
              className={inputClass}
              placeholder="Ex. 20"
            />
            <span className="mt-1 block text-xs text-foreground/50">
              Laissez vide pour ne pas limiter. Si la limite est atteinte, ce créneau n&apos;est plus proposé.
            </span>
          </label>

          <label className={labelClass}>
            Heure limite de commande *
            <input
              type="time"
              required
              value={point.orderDeadlineTime}
              onChange={(e) => patch({ orderDeadlineTime: e.target.value })}
              className={inputClass}
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="min-h-12 flex-1 rounded-xl bg-primary font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer ce lieu"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="min-h-12 rounded-xl border border-red-200 px-4 font-semibold text-red-600 disabled:opacity-60"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
