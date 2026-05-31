<?php

namespace App\Controller\Auth;

use App\Service\RegistrationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/verify-email')]
final class VerifyEmailController extends AbstractController
{
    public function __construct(
        private readonly RegistrationService $registrationService,
    ) {
    }

    #[Route('', name: 'api_verify_email', methods: ['POST'])]
    public function verify(Request $request): JsonResponse
    {
        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $token = trim((string) ($data['token'] ?? ''));
        if ($token === '') {
            return $this->json(['error' => 'Jeton de confirmation manquant.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->registrationService->verify($token);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'message' => 'Votre compte est activé. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
