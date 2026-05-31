<?php

namespace App\Enum;

enum OrderStatus: string
{
    case Draft = 'draft';
    case Reserved = 'reserved';
    case Prepared = 'prepared';
    case Retrieved = 'retrieved';
    case Cancelled = 'cancelled';
    case Absent = 'absent';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Reserved => 'Réservée',
            self::Prepared => 'Préparée',
            self::Retrieved => 'Récupérée',
            self::Cancelled => 'Annulée',
            self::Absent => 'Absent',
        };
    }

    public function isEditableByClient(): bool
    {
        return $this === self::Draft || $this === self::Reserved;
    }

    public function isFinal(): bool
    {
        return match ($this) {
            self::Retrieved, self::Cancelled, self::Absent => true,
            default => false,
        };
    }
}
