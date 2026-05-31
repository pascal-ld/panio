type ProductPhotoPlaceholderProps = {
  className?: string;
};

/** Illustration générique (panier) lorsqu’un produit n’a pas de photo. */
export function ProductPhotoPlaceholder({ className = "" }: ProductPhotoPlaceholderProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Produit sans photo"
    >
      <path
        d="M12 26h40l-4 28H16L12 26z"
        fill="var(--accent)"
        stroke="var(--primary)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 26c0-6 4.5-10 12-10s12 4 12 10"
        stroke="var(--primary)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16 26h32"
        stroke="var(--primary-light)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M22 34h4M30 34h4M38 34h4M26 42h4M34 42h4"
        stroke="var(--primary)"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.45"
      />
      <ellipse cx="32" cy="54" rx="14" ry="2.5" fill="var(--primary)" opacity="0.12" />
    </svg>
  );
}
