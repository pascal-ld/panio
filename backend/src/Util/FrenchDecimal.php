<?php

namespace App\Util;

final class FrenchDecimal
{
    /** Convertit une saisie française (virgule) en nombre décimal standard. */
    public static function normalize(string $value): string
    {
        $value = trim(str_replace(["\u{00A0}", ' '], '', $value));

        if (str_contains($value, ',') && str_contains($value, '.')) {
            $value = str_replace('.', '', $value);
        }

        return str_replace(',', '.', $value);
    }

    /** Affiche un montant au format français (ex. 4,50 € ou 1 234,50 €). */
    public static function format(string|float|null $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $normalized = is_string($value) ? self::normalize($value) : (string) $value;

        return number_format((float) $normalized, 2, ',', "\u{00A0}").' €';
    }
}
