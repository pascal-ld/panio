import Image from "next/image";
import { ProductPhotoPlaceholder } from "@/components/product/ProductPhotoPlaceholder";
import { getPhotoUrl } from "@/lib/producteur-api";

type ProductPhotoProps = {
  photoUrl: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
  imageClassName?: string;
};

export function ProductPhoto({
  photoUrl,
  alt = "",
  size = 56,
  className = "",
  imageClassName = "h-full w-full object-cover",
}: ProductPhotoProps) {
  const src = getPhotoUrl(photoUrl ?? null);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent/50 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={imageClassName}
          unoptimized
        />
      ) : (
        <ProductPhotoPlaceholder className="h-[62%] w-[62%]" />
      )}
    </div>
  );
}
