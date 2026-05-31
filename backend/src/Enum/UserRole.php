<?php

namespace App\Enum;

/**
 * Rôles applicatifs Panio.
 *
 * Visiteur : accès public sans authentification (PUBLIC_ACCESS dans security.yaml).
 * Les trois autres rôles sont attribués aux utilisateurs connectés.
 */
enum UserRole: string
{
    case Client = 'ROLE_CLIENT';
    case Producteur = 'ROLE_PRODUCTEUR';
    case SuperAdmin = 'ROLE_SUPER_ADMIN';

    public function label(): string
    {
        return match ($this) {
            self::Client => 'Client',
            self::Producteur => 'Producteur',
            self::SuperAdmin => 'Super administrateur',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $role) => $role->value, self::cases());
    }
}
