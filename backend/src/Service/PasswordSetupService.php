<?php

namespace App\Service;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PasswordSetupService
{
    public const INVITATION_TTL_DAYS = 7;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly UserRepository $userRepository,
        private readonly PasswordPolicy $passwordPolicy,
        private readonly AccountInvitationMailer $invitationMailer,
    ) {
    }

    public function issueInvitation(User $user): string
    {
        $token = bin2hex(random_bytes(32));
        $expiresAt = new \DateTimeImmutable(sprintf('+%d days', self::INVITATION_TTL_DAYS));

        $user->setPasswordSetupToken($token);
        $user->setPasswordSetupExpiresAt($expiresAt);
        $user->setIsEmailVerified(false);
        $user->setPassword($this->passwordHasher->hashPassword($user, $this->passwordPolicy->generateTemporary()));

        $this->entityManager->flush();
        $this->invitationMailer->send($user, $token);

        return $token;
    }

    /**
     * @return array{email: string, fullName: string|null, roleLabel: string}
     */
    public function inspectToken(string $token): array
    {
        $user = $this->findValidUserForToken($token);

        return [
            'email' => (string) $user->getEmail(),
            'fullName' => $user->getFullName(),
            'roleLabel' => $user->getRole()?->label() ?? 'Utilisateur',
        ];
    }

    public function completeSetup(string $token, string $password, string $confirmPassword): User
    {
        if ($password !== $confirmPassword) {
            throw new \InvalidArgumentException('Les mots de passe ne correspondent pas.');
        }

        $passwordError = $this->passwordPolicy->validate($password);
        if ($passwordError !== null) {
            throw new \InvalidArgumentException($passwordError);
        }

        $user = $this->findValidUserForToken($token);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));
        $user->clearPasswordSetupInvitation();
        $user->markEmailVerified();

        $this->entityManager->flush();

        return $user;
    }

    private function findValidUserForToken(string $token): User
    {
        $token = trim($token);
        if ($token === '') {
            throw new \InvalidArgumentException('Lien invalide.');
        }

        $user = $this->userRepository->findOneBy(['passwordSetupToken' => $token]);
        if ($user === null) {
            throw new \InvalidArgumentException('Lien invalide ou déjà utilisé.');
        }

        $expiresAt = $user->getPasswordSetupExpiresAt();
        if ($expiresAt === null || $expiresAt < new \DateTimeImmutable()) {
            throw new \InvalidArgumentException(
                sprintf('Ce lien a expiré. Demandez une nouvelle invitation (validité : %d jours).', self::INVITATION_TTL_DAYS),
            );
        }

        return $user;
    }
}
