import Image from "next/image";
import { ProducerPhotoPlaceholder } from "@/components/producer/ProducerPhotoPlaceholder";
import { getPhotoUrl } from "@/lib/producteur-api";

type ProducerPhotoProps = {
  photoPath: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
};

export function ProducerPhoto({
  photoPath,
  alt = "",
  size = 56,
  className = "",
}: ProducerPhotoProps) {
  const src = getPhotoUrl(photoPath ?? null);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-accent/50 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <ProducerPhotoPlaceholder className="h-[70%] w-[70%]" />
      )}
    </div>
  );
}
