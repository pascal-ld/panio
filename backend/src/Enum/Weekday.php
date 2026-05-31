<?php

namespace App\Enum;

enum Weekday: string
{
    case Monday = 'monday';
    case Tuesday = 'tuesday';
    case Wednesday = 'wednesday';
    case Thursday = 'thursday';
    case Friday = 'friday';
    case Saturday = 'saturday';
    case Sunday = 'sunday';

    public function label(): string
    {
        return match ($this) {
            self::Monday => 'Lundi',
            self::Tuesday => 'Mardi',
            self::Wednesday => 'Mercredi',
            self::Thursday => 'Jeudi',
            self::Friday => 'Vendredi',
            self::Saturday => 'Samedi',
            self::Sunday => 'Dimanche',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $day) => $day->value, self::cases());
    }

    /** Jour ISO-8601 (1 = lundi … 7 = dimanche). */
    public function toIsoWeekday(): int
    {
        return match ($this) {
            self::Monday => 1,
            self::Tuesday => 2,
            self::Wednesday => 3,
            self::Thursday => 4,
            self::Friday => 5,
            self::Saturday => 6,
            self::Sunday => 7,
        };
    }
}
