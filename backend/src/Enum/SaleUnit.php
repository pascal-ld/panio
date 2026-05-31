<?php

namespace App\Enum;

enum SaleUnit: string
{
    case Kg = 'kg';
    case Gram = 'g';
    case Piece = 'piece';
    case Bunch = 'bunch';
    case Bag = 'bag';
    case Tray = 'tray';

    public function label(): string
    {
        return match ($this) {
            self::Kg => 'kg',
            self::Gram => 'g',
            self::Piece => 'À la pièce',
            self::Bunch => 'À la botte',
            self::Bag => 'Sachet',
            self::Tray => 'Barquette',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $unit) => $unit->value, self::cases());
    }
}
