<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use App\Service\AdminUserManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/producers')]
#[IsGranted('ROLE_SUPER_ADMIN')]
final class ProducerController extends AbstractController
{
    #[Route('', name: 'api_admin_producers_list', methods: ['GET'])]
    public function list(Request $request, UserRepository $userRepository): JsonResponse
    {
        $query = trim((string) $request->query->get('q', ''));
        $producers = $userRepository->findProducersForAdmin($query);

        return $this->json(array_map($this->serializeProducer(...), $producers));
    }

    #[Route('', name: 'api_admin_producers_create', methods: ['POST'])]
    public function create(Request $request, AdminUserManager $adminUserManager): JsonResponse
    {
        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($data['fullName'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $enabled = !array_key_exists('enabled', $data) || (bool) $data['enabled'];

        if ($fullName === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($email === '') {
            return $this->json(['error' => 'L\'e-mail est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $producer = $adminUserManager->createUser(
                email: $email,
                role: UserRole::Producteur,
                fullName: $fullName,
                enabled: $enabled,
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            ...$this->serializeProducer($producer),
            'message' => 'Invitation envoyée par e-mail.',
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_admin_producers_update', methods: ['PUT'])]
    public function update(int $id, Request $request, UserRepository $userRepository, AdminUserManager $adminUserManager): JsonResponse
    {
        $producer = $userRepository->findProducerById($id);
        if ($producer === null) {
            return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = array_key_exists('fullName', $data) ? trim((string) $data['fullName']) : null;
        $email = array_key_exists('email', $data) ? trim((string) $data['email']) : null;
        $enabled = array_key_exists('enabled', $data) ? (bool) $data['enabled'] : null;
        $password = array_key_exists('password', $data) ? (string) $data['password'] : null;

        if ($fullName === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($email === '') {
            return $this->json(['error' => 'L\'e-mail est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $producer = $adminUserManager->updateUser(
                user: $producer,
                fullName: $fullName,
                email: $email,
                enabled: $enabled,
                password: $password,
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->serializeProducer($producer));
    }

    private function serializeProducer(User $producer): array
    {
        return [
            'id' => $producer->getId(),
            'fullName' => $producer->getFullName(),
            'email' => $producer->getEmail(),
            'slug' => $producer->getSlug(),
            'enabled' => $producer->isEnabled(),
            'isEmailVerified' => $producer->isEmailVerified(),
            'pendingPasswordSetup' => $producer->isPendingPasswordSetup(),
        ];
    }
}
