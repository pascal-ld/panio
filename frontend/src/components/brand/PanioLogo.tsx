import Image from "next/image";

type PanioLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function PanioLogo({ size = 40, className = "", priority = false }: PanioLogoProps) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt="Panio"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-xl object-cover ${className}`}
      unoptimized
    />
  );
}
