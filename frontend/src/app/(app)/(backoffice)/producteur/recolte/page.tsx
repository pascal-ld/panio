"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { openHarvestPrintWindow } from "@/lib/harvest-print";
import {
  fetchHarvest,
  fetchOrderDates,
  type HarvestItem,
} from "@/lib/producteur-orders-api";

export default function ProducteurRecoltePage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [pending, setPending] = useState<HarvestItem[]>([]);
  const [harvested, setHarvested] = useState<HarvestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrderDates()
      .then((d) => {
        setDates(d);
        if (d.length > 0) setSelectedDate(d[d.length - 1]);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetchHarvest(selectedDate)
      .then((data) => {
        setPending(data.pending);
        setHarvested(data.harvested);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const isEmpty = pending.length === 0 && harvested.length === 0;

  function handlePrint() {
    if (!selectedDate) return;
    const ok = openHarvestPrintWindow({
      dateLabel: formatDateLabel(selectedDate),
      pending,
    });
    if (!ok) {
      setError("Impossible d’ouvrir la fenêtre d’impression. Autorisez les pop-ups pour ce site.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-primary">Récolte</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Quantités à récolter pour le jour choisi.
        </p>
      </div>

      <label className="block text-sm font-medium text-foreground">
        Jour de collecte
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-4 py-3"
        >
          {dates.length === 0 && <option value="">Aucune commande</option>}
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDateLabel(d)}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {selectedDate && !loading && pending.length > 0 && (
        <button
          type="button"
          onClick={handlePrint}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-white px-4 text-sm font-semibold text-primary"
        >
          <PrintIcon />
          Liste imprimable
        </button>
      )}

      {loading ? (
        <PageLoader size="sm" />
      ) : isEmpty ? (
        <p className="rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-foreground/55">
          Aucune commande pour ce jour.
        </p>
      ) : (
        <HarvestSection
          hint="Commandes encore au statut « Réservée »."
          items={pending}
          emptyMessage="Tout est récolté pour ce jour."
        />
      )}
    </div>
  );
}

function HarvestSection({
  hint,
  items,
  emptyMessage,
}: {
  hint: string;
  items: HarvestItem[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs text-foreground/55">{hint}</p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/15 px-4 py-3 text-sm text-foreground/50">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.productId}-${item.saleUnitLabel}`}
              className="flex items-center justify-between rounded-xl border border-primary/15 bg-white px-4 py-3"
            >
              <span className="font-medium">{item.productName}</span>
              <span className="text-lg font-semibold text-primary">
                {formatQuantity(item.totalQuantity)} {item.saleUnitLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR");
}

function PrintIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
  );
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
