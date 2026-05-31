<?php

namespace App\Service;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class RegistrationService
{
    private const TOKEN_TTL_HOURS = 48;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly UserRepository $userRepository,
        private readonly AccountVerificationMailer $verificationMailer,
    ) {
    }

    /**
     * @return array{user: User, token: string}
     */
    public function register(string $fullName, string $email, string $phone, string $plainPassword): array
    {
        if ($this->userRepository->findOneBy(['email' => $email]) !== null) {
            throw new \DomainException('Cet e-mail est déjà utilisé.');
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = new \DateTimeImmutable(sprintf('+%d hours', self::TOKEN_TTL_HOURS));

        $user = new User();
        $user->setFullName($fullName);
        $user->setEmail($email);
        $user->setPhone($phone);
        $user->setRole(UserRole::Client);
        $user->setIsEmailVerified(false);
        $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));
        $user->setEmailVerificationToken($token);
        $user->setEmailVerificationExpiresAt($expiresAt);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $this->verificationMailer->send($user, $token);

        return ['user' => $user, 'token' => $token];
    }

    public function verify(string $token): User
    {
        $user = $this->userRepository->findOneBy(['emailVerificationToken' => $token]);
        if ($user === null) {
            throw new \DomainException('Lien de confirmation invalide.');
        }

        $expiresAt = $user->getEmailVerificationExpiresAt();
        if ($expiresAt === null || $expiresAt < new \DateTimeImmutable()) {
            throw new \DomainException('Ce lien de confirmation a expiré. Créez un nouveau compte.');
        }

        $user->markEmailVerified();
        $this->entityManager->flush();

        return $user;
    }
}
