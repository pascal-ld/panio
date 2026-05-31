import type { HarvestItem } from "@/lib/producteur-orders-api";

export type HarvestPrintData = {
  dateLabel: string;
  pending: HarvestItem[];
};

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR");
}

function renderRows(items: HarvestItem[]): string {
  if (items.length === 0) {
    return '<tr><td colspan="2" class="empty">—</td></tr>';
  }

  return items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.productName)}</td>
          <td class="qty">${escapeHtml(formatQuantity(item.totalQuantity))} ${escapeHtml(item.saleUnitLabel)}</td>
        </tr>`,
    )
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildHarvestPrintHtml(data: HarvestPrintData): string {
  const printedAt = new Date().toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Récolte — ${escapeHtml(data.dateLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #1a2e1a;
      margin: 0;
      padding: 24px;
      max-width: 720px;
    }
    h1 { font-size: 1.35rem; margin: 0 0 4px; color: #2d6a4f; }
    .meta { font-size: 0.85rem; color: #4a5d4a; margin-bottom: 24px; }
    h2 {
      font-size: 1rem;
      margin: 20px 0 8px;
      color: #2d6a4f;
      border-bottom: 1px solid #c8e6c9;
      padding-bottom: 4px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid #e8efe8;
      font-size: 0.95rem;
    }
    th { font-weight: 600; background: #f8faf6; }
    td.qty { text-align: right; white-space: nowrap; font-weight: 600; }
    td.empty { color: #6b7c6b; font-style: italic; }
    .hint { font-size: 0.8rem; color: #6b7c6b; margin: 0 0 12px; }
    .toolbar {
      margin-bottom: 20px;
      display: flex;
      gap: 8px;
    }
    button {
      font: inherit;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #2d6a4f;
      background: #2d6a4f;
      color: #fff;
      cursor: pointer;
    }
    button.secondary {
      background: #fff;
      color: #2d6a4f;
    }
    @media print {
      body { padding: 0; }
      .toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Imprimer</button>
    <button type="button" class="secondary" onclick="window.close()">Fermer</button>
  </div>
  <h1>Récolte</h1>
  <p class="meta">${escapeHtml(data.dateLabel)} · édité le ${escapeHtml(printedAt)}</p>

  <h2>À récolter</h2>
  <p class="hint">Commandes au statut « Réservée ».</p>
  <table>
    <thead>
      <tr><th>Produit</th><th style="text-align:right">Quantité</th></tr>
    </thead>
    <tbody>${renderRows(data.pending)}</tbody>
  </table>
</body>
</html>`;
}

export function openHarvestPrintWindow(data: HarvestPrintData): boolean {
  const html = buildHarvestPrintHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const popup = window.open(url, "_blank");
  if (!popup) {
    URL.revokeObjectURL(url);
    return false;
  }

  const revoke = () => URL.revokeObjectURL(url);
  popup.addEventListener("load", revoke, { once: true });
  window.setTimeout(revoke, 60_000);
  popup.focus();
  return true;
}
