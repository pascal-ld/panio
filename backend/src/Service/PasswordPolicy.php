<?php

namespace App\Service;

final class PasswordPolicy
{
    public const MIN_LENGTH = 12;
    public const MIN_DIGITS = 1;
    public const MIN_SPECIAL = 1;

    public function validate(string $password): ?string
    {
        if (strlen($password) < self::MIN_LENGTH) {
            return sprintf(
                'Le mot de passe doit contenir au moins %d caractères.',
                self::MIN_LENGTH,
            );
        }

        if ($this->countDigits($password) < self::MIN_DIGITS) {
            return sprintf(
                'Le mot de passe doit contenir au moins %d chiffre.',
                self::MIN_DIGITS,
            );
        }

        if ($this->countSpecialCharacters($password) < self::MIN_SPECIAL) {
            return sprintf(
                'Le mot de passe doit contenir au moins %d caractère spécial (ex. ! ? @ #).',
                self::MIN_SPECIAL,
            );
        }

        return null;
    }

    public function requirementHint(): string
    {
        return sprintf(
            'Au moins %d caractères, dont %d chiffre et %d caractère spécial.',
            self::MIN_LENGTH,
            self::MIN_DIGITS,
            self::MIN_SPECIAL,
        );
    }

    public function generateTemporary(): string
    {
        return bin2hex(random_bytes(8)).'9!aA';
    }

    private function countDigits(string $password): int
    {
        return preg_match_all('/\d/', $password) ?: 0;
    }

    private function countSpecialCharacters(string $password): int
    {
        return preg_match_all('/[^a-zA-Z0-9]/', $password) ?: 0;
    }
}
