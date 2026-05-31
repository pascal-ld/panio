"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrganicBadge } from "@/components/producer/OrganicBadge";
import {
  addFavoriteProducer,
  fetchClientPreferences,
  fetchProducers,
  removeFavoriteProducer,
  type ProducerSummary,
} from "@/lib/client-api";

export default function ClientProducteursPage() {
  const [producers, setProducers] = useState<ProducerSummary[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProducers(), fetchClientPreferences()])
      .then(([list, prefs]) => {
        setProducers(list);
        setFavoriteSlugs(new Set(prefs.favoriteProducers.map((p) => p.slug)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddFavorite(slug: string) {
    setSavingSlug(slug);
    setError(null);
    try {
      const result = await addFavoriteProducer(slug);
      setFavoriteSlugs(new Set(result.favoriteProducers.map((p) => p.slug)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingSlug(null);
    }
  }

  async function handleRemoveFavorite(slug: string) {
    setSavingSlug(slug);
    setError(null);
    try {
      const result = await removeFavoriteProducer(slug);
      setFavoriteSlugs(new Set(result.favoriteProducers.map((p) => p.slug)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingSlug(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-primary">Producteurs</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Tous les producteurs disponibles près de chez vous. Vous pouvez en ajouter plusieurs en favoris.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {producers.map((producer) => {
          const isFavorite = favoriteSlugs.has(producer.slug);
          return (
            <li
              key={producer.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                isFavorite ? "border-primary/30 bg-accent/40" : "border-primary/10 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{producer.fullName}</p>
                    {producer.producerOrganic && <OrganicBadge />}
                  </div>
                  <p className="text-xs text-foreground/50">/producteur/{producer.slug}</p>
                </div>
                {isFavorite && (
                  <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                    Favori
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/producteur/${producer.slug}`}
                  className="min-h-10 rounded-lg border border-primary/25 px-4 py-2 text-sm font-semibold text-primary"
                >
                  Ouvrir le stand
                </Link>
                {isFavorite ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(producer.slug)}
                    disabled={savingSlug === producer.slug}
                    className="min-h-10 rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold text-foreground/70 disabled:opacity-50"
                  >
                    {savingSlug === producer.slug ? "…" : "Retirer des favoris"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddFavorite(producer.slug)}
                    disabled={savingSlug === producer.slug}
                    className="min-h-10 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
                  >
                    {savingSlug === producer.slug ? "…" : "Mettre en favori"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {producers.length === 0 && (
        <p className="text-center text-sm text-foreground/55">Aucun producteur disponible.</p>
      )}
    </div>
  );
}
