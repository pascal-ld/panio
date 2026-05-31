<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

final class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
    }

    public function checkPostAuth(UserInterface $user): void
    {
        if (!$user instanceof User) {
            return;
        }

        if (!$user->isEmailVerified()) {
            throw new CustomUserMessageAccountStatusException(
                $user->isPendingPasswordSetup()
                    ? 'Créez votre mot de passe via le lien reçu par e-mail avant de vous connecter.'
                    : 'Confirmez votre adresse e-mail avant de vous connecter. Consultez votre boîte de réception.',
            );
        }

        if (!$user->isEnabled()) {
            throw new CustomUserMessageAccountStatusException(
                'Ce compte est désactivé. Contactez l\'administrateur.',
            );
        }
    }
}
