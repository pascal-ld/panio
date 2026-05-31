import Image from "next/image";

type OrganicBadgeProps = {
  className?: string;
  height?: number;
};

/** Logo officiel Agriculture Biologique (marque AB). */
export function OrganicBadge({ className = "", height = 28 }: OrganicBadgeProps) {
  const width = Math.round((height * 403) / 482);

  return (
    <Image
      src="/logos/agriculture-biologique.svg"
      alt="Agriculture Biologique"
      width={width}
      height={height}
      className={`inline-block shrink-0 object-contain ${className}`}
      unoptimized
    />
  );
}
