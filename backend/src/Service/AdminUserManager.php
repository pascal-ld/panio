<?php

namespace App\Service;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\CustomerOrderRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AdminUserManager
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly UserRepository $userRepository,
        private readonly CustomerOrderRepository $orderRepository,
        private readonly ProducerSlugGenerator $slugGenerator,
        private readonly PasswordPolicy $passwordPolicy,
        private readonly PasswordSetupService $passwordSetupService,
    ) {
    }

    public function createUser(
        string $email,
        UserRole $role,
        ?string $fullName = null,
        ?string $phone = null,
        bool $enabled = true,
    ): User {
        $email = mb_strtolower(trim($email));
        if ($this->userRepository->findOneBy(['email' => $email]) !== null) {
            throw new \InvalidArgumentException('Un utilisateur existe déjà avec cet e-mail.');
        }

        $user = new User();
        $user->setEmail($email);
        $user->setRole($role);
        $user->setFullName($this->normalizeOptionalString($fullName));
        $user->setPhone($this->normalizeOptionalString($phone));
        $user->setEnabled($enabled);
        $user->setIsEmailVerified(false);
        $user->setPassword($this->passwordHasher->hashPassword($user, $this->passwordPolicy->generateTemporary()));

        if ($role === UserRole::Producteur) {
            $name = $user->getFullName() ?? $user->getEmail();
            $user->setSlug($this->slugGenerator->generateFromName($name));
        }

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $this->passwordSetupService->issueInvitation($user);

        return $user;
    }

    public function updateUser(
        User $user,
        ?string $fullName = null,
        ?string $email = null,
        ?string $phone = null,
        ?UserRole $role = null,
        ?bool $enabled = null,
        ?string $password = null,
    ): User {
        if ($fullName !== null) {
            $user->setFullName($this->normalizeOptionalString($fullName));
        }

        if ($email !== null) {
            $email = mb_strtolower(trim($email));
            $existing = $this->userRepository->findOneBy(['email' => $email]);
            if ($existing !== null && $existing->getId() !== $user->getId()) {
                throw new \InvalidArgumentException('Un utilisateur existe déjà avec cet e-mail.');
            }
            $user->setEmail($email);
        }

        if ($phone !== null) {
            $user->setPhone($this->normalizeOptionalString($phone));
        }

        if ($role !== null) {
            $previousRole = $user->getRole();
            $user->setRole($role);

            if ($role === UserRole::Producteur && $user->getSlug() === null) {
                $name = $user->getFullName() ?? $user->getEmail();
                $user->setSlug($this->slugGenerator->generateFromName($name, $user->getId()));
            }

            if ($previousRole === UserRole::Producteur && $role !== UserRole::Producteur) {
                $user->setSlug(null);
            }
        }

        if ($enabled !== null) {
            $user->setEnabled($enabled);
        }

        if ($password !== null && $password !== '') {
            $this->assertPasswordValid($password);
            $user->setPassword($this->passwordHasher->hashPassword($user, $password));
            $user->clearPasswordSetupInvitation();
            $user->markEmailVerified();
        }

        if ($user->hasRole(UserRole::Producteur) && $user->getSlug() === null) {
            $name = $user->getFullName() ?? $user->getEmail();
            $user->setSlug($this->slugGenerator->generateFromName($name, $user->getId()));
        }

        $this->entityManager->flush();

        return $user;
    }

    public function deleteUser(User $user, User $actingAdmin): void
    {
        if ($user->getId() === $actingAdmin->getId()) {
            throw new \InvalidArgumentException('Vous ne pouvez pas supprimer votre propre compte.');
        }

        if ($this->orderRepository->countByUser($user) > 0) {
            throw new \InvalidArgumentException(
                'Impossible de supprimer cet utilisateur : des commandes y sont liées. Désactivez-le plutôt.',
            );
        }

        $this->entityManager->remove($user);
        $this->entityManager->flush();
    }

    private function normalizeOptionalString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function assertPasswordValid(string $password): void
    {
        $error = $this->passwordPolicy->validate($password);
        if ($error !== null) {
            throw new \InvalidArgumentException($error);
        }
    }
}
