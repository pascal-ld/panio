<?php

namespace App\Service;

use App\Repository\UserRepository;

final class ProducerSlugGenerator
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {
    }

    public function generateFromName(string $fullName, ?int $excludeUserId = null): string
    {
        $base = $this->slugify($fullName);
        if ($base === '') {
            $base = 'producteur';
        }

        $slug = $base;
        $suffix = 2;
        while ($this->userRepository->isSlugTaken($slug, $excludeUserId)) {
            $slug = $base.'-'.$suffix;
            ++$suffix;
        }

        return $slug;
    }

    public function normalize(string $slug): string
    {
        $slug = $this->slugify($slug);

        return $slug !== '' ? $slug : 'producteur';
    }

    private function slugify(string $value): string
    {
        $value = mb_strtolower(trim($value), 'UTF-8');
        $value = str_replace(
            ['à', 'á', 'â', 'ä', 'ã', 'å', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ò', 'ó', 'ô', 'ö', 'ù', 'ú', 'û', 'ü', 'ý', 'ÿ', 'ñ', 'œ'],
            ['a', 'a', 'a', 'a', 'a', 'a', 'c', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u', 'y', 'y', 'n', 'oe'],
            $value,
        );
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        $value = trim($value, '-');

        return substr($value, 0, 80);
    }
}
