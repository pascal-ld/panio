const frPriceFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Parse un nombre saisi en français (virgule décimale, espaces insécables). */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  return Number.parseFloat(normalized);
}

/** Affiche un prix ou nombre décimal au format français (ex. 4,50). */
export function formatDecimal(value: string | number): string {
  const num = typeof value === "string" ? parseDecimal(value) : value;
  if (Number.isNaN(num)) {
    return typeof value === "string" ? value : "";
  }
  return frPriceFormatter.format(num);
}

/** Montant déjà formaté par l'API (ex. « 4,50 ») → « 4,50 € » */
export function formatMoneyLabel(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.includes("€")) return trimmed;
  return `${trimmed} €`;
}

/** Prix avec symbole € : « 4,50 € » */
export function formatPrice(value: string | number): string {
  if (typeof value === "string" && value.includes("€")) {
    return value.trim();
  }
  return `${formatDecimal(value)} €`;
}

/** Valeur normalisée pour l'API (point décimal, 2 décimales). */
export function formatDecimalForApi(value: string): string {
  const num = parseDecimal(value);
  if (Number.isNaN(num) || num < 0) {
    return value;
  }
  return num.toFixed(2);
}
