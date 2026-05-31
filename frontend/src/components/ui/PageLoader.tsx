type PageLoaderProps = {
  /** Texte optionnel sous le spinner */
  label?: string;
  /** Centré dans la zone disponible (défaut) ou compact pour les listes */
  size?: "md" | "sm";
};

export function PageLoader({ label, size = "md" }: PageLoaderProps) {
  const spinnerClass =
    size === "sm"
      ? "h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
      : "h-9 w-9 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        size === "sm" ? "py-8" : "py-16"
      }`}
    >
      <div className={spinnerClass} role="status" aria-label={label ?? "Chargement"} />
      {label && <p className="text-sm text-foreground/55">{label}</p>}
    </div>
  );
}
