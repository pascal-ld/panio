<?php

namespace App\Controller\Auth;

use App\Service\PasswordSetupService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/set-password')]
final class SetPasswordController extends AbstractController
{
    public function __construct(
        private readonly PasswordSetupService $passwordSetupService,
    ) {
    }

    #[Route('', name: 'api_set_password_check', methods: ['GET'])]
    public function check(Request $request): JsonResponse
    {
        $token = trim((string) $request->query->get('token', ''));
        if ($token === '') {
            return $this->json(['error' => 'Lien invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $info = $this->passwordSetupService->inspectToken($token);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($info);
    }

    #[Route('', name: 'api_set_password', methods: ['POST'])]
    public function setPassword(Request $request): JsonResponse
    {
        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $token = trim((string) ($data['token'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $confirmPassword = (string) ($data['confirmPassword'] ?? '');

        if ($token === '') {
            return $this->json(['error' => 'Lien invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->passwordSetupService->completeSetup($token, $password, $confirmPassword);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'message' => 'Mot de passe créé. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
