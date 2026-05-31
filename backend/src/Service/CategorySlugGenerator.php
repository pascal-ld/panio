<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\CategoryRepository;

final class CategorySlugGenerator
{
    public function __construct(
        private readonly CategoryRepository $categoryRepository,
    ) {
    }

    public function generateFromName(string $name, User $producer, ?int $excludeCategoryId = null): string
    {
        $base = $this->slugify($name);
        if ($base === '') {
            $base = 'categorie';
        }

        $slug = $base;
        $suffix = 2;
        while ($this->categoryRepository->isSlugTaken($producer, $slug, $excludeCategoryId)) {
            $slug = $base.'-'.$suffix;
            ++$suffix;
        }

        return $slug;
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
