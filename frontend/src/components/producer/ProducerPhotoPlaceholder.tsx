type ProducerPhotoPlaceholderProps = {
  className?: string;
};

/** Illustration générique lorsqu'un producteur n'a pas de photo. */
export function ProducerPhotoPlaceholder({ className = "" }: ProducerPhotoPlaceholderProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Producteur sans photo"
    >
      <circle cx="32" cy="32" r="28" fill="var(--accent)" stroke="var(--primary)" strokeWidth="1.5" />
      <circle cx="32" cy="26" r="9" fill="var(--primary)" opacity="0.2" stroke="var(--primary)" strokeWidth="1.5" />
      <path
        d="M16 50c2.5-10 9-14 16-14s13.5 4 16 14"
        fill="var(--primary)"
        opacity="0.15"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M44 20c3 0 5 2 5 4.5S47 29 44 29M20 20c-3 0-5 2-5 4.5S17 29 20 29"
        stroke="var(--primary-light)"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
