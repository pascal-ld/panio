<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ProducerPhotoUploader
{
    private const MAX_SIZE = 10 * 1024 * 1024;
    private const ALLOWED_MIME = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
    ];

    public function __construct(
        private readonly string $uploadDirectory,
        private readonly ProductImageCompressor $imageCompressor,
    ) {
    }

    public function upload(UploadedFile $file): string
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException(
                $file->getErrorMessage() ?: 'La photo n\'a pas pu être envoyée. Réessayez ou choisissez un autre fichier.',
            );
        }

        if ($file->getSize() > self::MAX_SIZE) {
            throw new \InvalidArgumentException('La photo ne doit pas dépasser 10 Mo.');
        }

        $mime = $file->getMimeType() ?? '';
        if (!in_array($mime, self::ALLOWED_MIME, true)) {
            throw new \InvalidArgumentException('Format photo non supporté (JPEG, PNG ou WebP).');
        }

        $sourcePath = $file->getPathname();

        try {
            $filename = $this->imageCompressor->compress($sourcePath, $this->uploadDirectory);
        } catch (\RuntimeException) {
            $filename = $this->storeOriginal($file, $mime);
        }

        return '/uploads/producers/'.$filename;
    }

    private function storeOriginal(UploadedFile $file, string $mime): string
    {
        if (!is_dir($this->uploadDirectory) && !mkdir($this->uploadDirectory, 0775, true) && !is_dir($this->uploadDirectory)) {
            throw new \RuntimeException('Impossible de créer le dossier de destination.');
        }

        $extension = match ($mime) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/heic', 'image/heif' => 'heic',
            default => 'jpg',
        };

        $filename = bin2hex(random_bytes(16)).'.'.$extension;
        $file->move($this->uploadDirectory, $filename);

        return $filename;
    }
}
