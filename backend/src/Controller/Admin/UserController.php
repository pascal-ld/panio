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

#[Route('/api/admin/users')]
#[IsGranted('ROLE_SUPER_ADMIN')]
final class UserController extends AbstractController
{
    #[Route('', name: 'api_admin_users_list', methods: ['GET'])]
    public function list(Request $request, UserRepository $userRepository): JsonResponse
    {
        $query = trim((string) $request->query->get('q', ''));
        $roleFilter = $this->resolveRoleFilter((string) $request->query->get('role', ''));
        $users = $userRepository->findUsersForAdmin($query, $roleFilter);

        return $this->json(array_map($this->serializeUser(...), $users));
    }

    #[Route('', name: 'api_admin_users_create', methods: ['POST'])]
    public function create(Request $request, AdminUserManager $adminUserManager): JsonResponse
    {
        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($data['fullName'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $enabled = !array_key_exists('enabled', $data) || (bool) $data['enabled'];
        $role = $this->resolveRole((string) ($data['role'] ?? ''));

        if ($email === '') {
            return $this->json(['error' => 'L\'e-mail est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($role === null) {
            return $this->json(['error' => 'Rôle invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $user = $adminUserManager->createUser(
                email: $email,
                role: $role,
                fullName: $fullName !== '' ? $fullName : null,
                phone: $phone !== '' ? $phone : null,
                enabled: $enabled,
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            ...$this->serializeUser($user),
            'message' => 'Invitation envoyée par e-mail.',
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_admin_users_update', methods: ['PUT'])]
    public function update(int $id, Request $request, UserRepository $userRepository, AdminUserManager $adminUserManager): JsonResponse
    {
        $user = $userRepository->find($id);
        if ($user === null) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = array_key_exists('fullName', $data) ? trim((string) $data['fullName']) : null;
        $email = array_key_exists('email', $data) ? trim((string) $data['email']) : null;
        $phone = array_key_exists('phone', $data) ? trim((string) $data['phone']) : null;
        $enabled = array_key_exists('enabled', $data) ? (bool) $data['enabled'] : null;
        $password = array_key_exists('password', $data) ? (string) $data['password'] : null;
        $role = array_key_exists('role', $data) ? $this->resolveRole((string) $data['role']) : null;

        if ($email === '') {
            return $this->json(['error' => 'L\'e-mail est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($role === null && array_key_exists('role', $data)) {
            return $this->json(['error' => 'Rôle invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $user = $adminUserManager->updateUser(
                user: $user,
                fullName: $fullName,
                email: $email,
                phone: $phone,
                role: $role,
                enabled: $enabled,
                password: $password,
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->serializeUser($user));
    }

    #[Route('/{id}', name: 'api_admin_users_delete', methods: ['DELETE'])]
    public function delete(int $id, UserRepository $userRepository, AdminUserManager $adminUserManager): JsonResponse
    {
        $user = $userRepository->find($id);
        if ($user === null) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $admin = $this->getUser();
        if (!$admin instanceof User) {
            return $this->json(['error' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $adminUserManager->deleteUser($user, $admin);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function serializeUser(User $user): array
    {
        $role = $user->getRole();

        return [
            'id' => $user->getId(),
            'fullName' => $user->getFullName(),
            'email' => $user->getEmail(),
            'phone' => $user->getPhone(),
            'role' => $role?->value,
            'roleLabel' => $role?->label(),
            'enabled' => $user->isEnabled(),
            'isEmailVerified' => $user->isEmailVerified(),
            'pendingPasswordSetup' => $user->isPendingPasswordSetup(),
            'slug' => $user->getSlug(),
        ];
    }

    private function resolveRole(string $role): ?UserRole
    {
        return match (strtolower(trim($role))) {
            'client', 'role_client' => UserRole::Client,
            'producteur', 'role_producteur' => UserRole::Producteur,
            'super_admin', 'superadmin', 'admin', 'role_super_admin' => UserRole::SuperAdmin,
            default => null,
        };
    }

    private function resolveRoleFilter(string $role): ?UserRole
    {
        $role = trim($role);
        if ($role === '') {
            return null;
        }

        return $this->resolveRole($role);
    }
}
