<?php

namespace App\Util;

use App\Enum\Weekday;

final class FrenchDateFormatter
{
    public static function formatDate(\DateTimeImmutable $date): string
    {
        $days = array_map(static fn (Weekday $d) => $d->label(), Weekday::cases());
        $dayLabel = $days[(int) $date->format('N') - 1] ?? $date->format('l');

        return sprintf('%s %s %s', $dayLabel, $date->format('j'), self::month((int) $date->format('n')));
    }

    private static function month(int $month): string
    {
        return match ($month) {
            1 => 'janvier',
            2 => 'février',
            3 => 'mars',
            4 => 'avril',
            5 => 'mai',
            6 => 'juin',
            7 => 'juillet',
            8 => 'août',
            9 => 'septembre',
            10 => 'octobre',
            11 => 'novembre',
            12 => 'décembre',
            default => '',
        };
    }
}
