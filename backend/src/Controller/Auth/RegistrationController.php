<?php

namespace App\Controller\Auth;

use App\Service\PasswordPolicy;
use App\Service\RegistrationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/register')]
final class RegistrationController extends AbstractController
{
    public function __construct(
        private readonly RegistrationService $registrationService,
        private readonly PasswordPolicy $passwordPolicy,
    ) {
    }

    #[Route('', name: 'api_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($data['fullName'] ?? ''));
        $email = mb_strtolower(trim((string) ($data['email'] ?? '')));
        $phone = trim((string) ($data['phone'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($fullName === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        if (strlen($fullName) > 150) {
            return $this->json(['error' => 'Le nom est trop long.'], Response::HTTP_BAD_REQUEST);
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'E-mail invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if ($phone === '') {
            return $this->json(['error' => 'Le numéro de téléphone est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        if (strlen($phone) > 30) {
            return $this->json(['error' => 'Le numéro de téléphone est trop long.'], Response::HTTP_BAD_REQUEST);
        }

        $passwordError = $this->passwordPolicy->validate($password);
        if ($passwordError !== null) {
            return $this->json(['error' => $passwordError], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->registrationService->register($fullName, $email, $phone, $password);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_CONFLICT);
        } catch (\Throwable) {
            return $this->json(
                ['error' => 'Impossible d\'envoyer l\'e-mail de confirmation. Réessayez plus tard.'],
                Response::HTTP_SERVICE_UNAVAILABLE,
            );
        }

        return $this->json([
            'message' => 'Un e-mail de confirmation a été envoyé. Consultez votre boîte de réception pour activer votre compte.',
        ], Response::HTTP_CREATED);
    }
}
