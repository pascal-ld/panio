<?php

namespace App\Controller\Client;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/client/profile')]
#[IsGranted('ROLE_CLIENT')]
final class ProfileController extends AbstractController
{
    #[Route('', name: 'api_client_profile_get', methods: ['GET'])]
    public function get(): JsonResponse
    {
        return $this->json($this->serializeProfile($this->requireClient()));
    }

    #[Route('', name: 'api_client_profile_update', methods: ['PUT'])]
    public function update(
        Request $request,
        EntityManagerInterface $entityManager,
        UserRepository $userRepository,
    ): JsonResponse {
        $user = $this->requireClient();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($data['fullName'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));

        if ($fullName === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'E-mail invalide.'], Response::HTTP_BAD_REQUEST);
        }
        if (strlen($phone) > 30) {
            return $this->json(['error' => 'Le numéro de téléphone est trop long.'], Response::HTTP_BAD_REQUEST);
        }

        $existing = $userRepository->findOneBy(['email' => $email]);
        if ($existing !== null && $existing->getId() !== $user->getId()) {
            return $this->json(['error' => 'Cet e-mail est déjà utilisé.'], Response::HTTP_BAD_REQUEST);
        }

        $user->setFullName($fullName);
        $user->setPhone($phone !== '' ? $phone : null);
        $user->setEmail($email);
        $entityManager->flush();

        return $this->json($this->serializeProfile($user));
    }

    private function requireClient(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProfile(User $user): array
    {
        return [
            'fullName' => $user->getFullName(),
            'email' => $user->getEmail(),
            'phone' => $user->getPhone(),
        ];
    }
}
