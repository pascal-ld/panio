<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\PasswordPolicy;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class MeController extends AbstractController
{
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function __invoke(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Utilisateur introuvable'], 401);
        }

        $role = $user->getRole();

        return $this->json([
            'email' => $user->getUserIdentifier(),
            'fullName' => $user->getFullName(),
            'phone' => $user->getPhone(),
            'roles' => $user->getRoles(),
            'role' => $role?->value,
            'roleLabel' => $role?->label(),
        ]);
    }

    #[Route('/api/me/password', name: 'api_me_password', methods: ['PATCH'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function changePassword(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        PasswordPolicy $passwordPolicy,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Utilisateur introuvable'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $currentPassword = (string) ($data['currentPassword'] ?? '');
        $newPassword = (string) ($data['newPassword'] ?? '');
        $confirmPassword = (string) ($data['confirmPassword'] ?? '');

        if ($currentPassword === '') {
            return $this->json(['error' => 'Le mot de passe actuel est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($newPassword === '') {
            return $this->json(['error' => 'Le nouveau mot de passe est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        $passwordError = $passwordPolicy->validate($newPassword);
        if ($passwordError !== null) {
            return $this->json(['error' => $passwordError], Response::HTTP_BAD_REQUEST);
        }
        if ($newPassword !== $confirmPassword) {
            return $this->json(['error' => 'Les mots de passe ne correspondent pas.'], Response::HTTP_BAD_REQUEST);
        }
        if (!$passwordHasher->isPasswordValid($user, $currentPassword)) {
            return $this->json(['error' => 'Mot de passe actuel incorrect.'], Response::HTTP_BAD_REQUEST);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
        $entityManager->flush();

        return $this->json(['message' => 'Mot de passe mis à jour.']);
    }
}
