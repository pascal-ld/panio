"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductPhoto } from "@/components/product/ProductPhoto";
import type { ClientOrder, OrderLine } from "@/lib/client-api";
import { formatMoneyLabel } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-900",
  reserved: "bg-primary/15 text-primary",
  prepared: "bg-blue-100 text-blue-900",
  retrieved: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
  absent: "bg-red-100 text-red-800",
};

export function OrderCard({
  order,
  standHref,
  expandable = false,
  defaultOpen = false,
}: {
  order: ClientOrder;
  standHref?: string;
  expandable?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badgeClass = STATUS_COLORS[order.status] ?? "bg-accent text-primary";

  const header = (
    <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {order.producer?.fullName && (
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                {order.producer.fullName}
              </p>
            )}
            <p className="font-semibold text-foreground">
              {order.collectionDateLabel ?? order.collectionDate}
            </p>
            <p className="text-sm text-foreground/65">{order.distributionPoint?.locationLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${badgeClass}`}>
              {order.statusLabel}
            </span>
            {expandable && (
              <span
                className={`text-primary transition ${open ? "rotate-180" : ""}`}
                aria-hidden
              >
                ▾
              </span>
            )}
          </div>
    </div>
  );

  if (!expandable) {
    return (
      <article className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
        {header}
        <ul className="mt-3 space-y-1 text-sm text-foreground/75">
          {order.lines.map((line, i) => (
            <li key={i}>
              {line.quantity} × {line.productName}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-primary/15 pt-3 text-sm font-semibold text-foreground">
          Total commande : {formatMoneyLabel(order.totalFormatted)}
        </p>
        {standHref && (
          <Link
            href={standHref}
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline"
          >
            Voir sur le stand →
          </Link>
        )}
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 text-left"
        aria-expanded={open}
      >
        {header}
      </button>
      {open && (
        <div className="border-t border-primary/10 px-4 pb-4 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Détail de la commande
          </p>
          <ul className="space-y-3">
            {order.lines
              .filter((line) => line.quantity > 0)
              .map((line) => (
                <OrderLineRow key={`${line.productId}-${line.productName}`} line={line} />
              ))}
          </ul>
          {order.producerComment && order.producerComment.trim() !== "" && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              <p className="font-semibold">Message du producteur</p>
              <p className="mt-1 whitespace-pre-line">{order.producerComment}</p>
            </div>
          )}
          <p className="mt-4 border-t border-primary/15 pt-3 text-sm font-medium text-foreground">
            {order.lines.reduce((n, l) => n + l.quantity, 0)} article(s) ·{" "}
            {formatMoneyLabel(order.totalFormatted)}
          </p>
          {standHref && (
            <Link
              href={standHref}
              className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline"
            >
              Voir le producteur →
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function OrderLineRow({ line }: { line: OrderLine }) {
  return (
    <li className="flex gap-3 rounded-xl border border-primary/10 bg-background/50 p-2.5">
      <ProductPhoto photoUrl={line.photoUrl} alt={line.productName} size={56} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{line.productName}</p>
        <p className="text-sm text-primary">
          {formatMoneyLabel(line.unitPriceFormatted)} / {line.saleUnitLabel}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          Quantité : <span className="text-primary">{line.quantity}</span>
          {line.lineTotalFormatted && (
            <span className="ml-2 font-normal text-foreground/60">
              · {formatMoneyLabel(line.lineTotalFormatted)}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
