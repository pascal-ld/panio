<?php

namespace App\Service;

/**
 * Redimensionne et compresse les photos produit pour un affichage mobile fluide.
 */
final class ProductImageCompressor
{
    private const MAX_DIMENSION = 1200;
    private const WEBP_QUALITY = 80;
    private const JPEG_QUALITY = 82;

    public function compress(string $sourcePath, string $targetDirectory): string
    {
        if (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0775, true) && !is_dir($targetDirectory)) {
            throw new \RuntimeException('Impossible de créer le dossier de destination.');
        }

        $info = @getimagesize($sourcePath);
        if ($info === false) {
            throw new \RuntimeException('Image illisible ou format non pris en charge pour la compression.');
        }

        $source = $this->createImageResource($sourcePath, $info[2]);
        if ($source === false) {
            throw new \RuntimeException('Impossible de charger l\'image source.');
        }

        [$srcW, $srcH] = [$info[0], $info[1]];
        [$dstW, $dstH] = $this->scaledDimensions($srcW, $srcH);

        $canvas = imagecreatetruecolor($dstW, $dstH);
        if ($canvas === false) {
            imagedestroy($source);
            throw new \RuntimeException('Impossible de préparer l\'image compressée.');
        }

        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);

        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
        imagedestroy($source);

        $useWebp = function_exists('imagewebp');
        $filename = bin2hex(random_bytes(16)).($useWebp ? '.webp' : '.jpg');
        $targetPath = rtrim($targetDirectory, '/').'/'.$filename;

        $saved = $useWebp
            ? imagewebp($canvas, $targetPath, self::WEBP_QUALITY)
            : imagejpeg($canvas, $targetPath, self::JPEG_QUALITY);

        imagedestroy($canvas);

        if (!$saved) {
            throw new \RuntimeException('Échec de l\'enregistrement de l\'image compressée.');
        }

        return $filename;
    }

    /**
     * @return resource|false
     */
    private function createImageResource(string $path, int $type)
    {
        return match ($type) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($path),
            IMAGETYPE_PNG => imagecreatefrompng($path),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($path) : false,
            default => false,
        };
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function scaledDimensions(int $width, int $height): array
    {
        $max = self::MAX_DIMENSION;
        if ($width <= $max && $height <= $max) {
            return [$width, $height];
        }

        $ratio = min($max / $width, $max / $height);

        return [
            max(1, (int) round($width * $ratio)),
            max(1, (int) round($height * $ratio)),
        ];
    }
}
