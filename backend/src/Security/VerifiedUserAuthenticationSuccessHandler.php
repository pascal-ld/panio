<?php

namespace App\Security;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Security\Http\Authentication\AuthenticationSuccessHandler;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationSuccessHandlerInterface;

/**
 * Bloque la connexion tant que l'e-mail n'est pas confirmé (json_login n'appelle pas le UserChecker).
 */
final class VerifiedUserAuthenticationSuccessHandler implements AuthenticationSuccessHandlerInterface
{
    public function __construct(
        private readonly AuthenticationSuccessHandler $lexikHandler,
    ) {
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token): Response
    {
        $user = $token->getUser();
        if ($user instanceof User && !$user->isEmailVerified()) {
            return new JsonResponse([
                'message' => $user->isPendingPasswordSetup()
                    ? 'Créez votre mot de passe via le lien reçu par e-mail avant de vous connecter.'
                    : 'Confirmez votre adresse e-mail avant de vous connecter. Consultez votre boîte de réception.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user instanceof User && !$user->isEnabled()) {
            return new JsonResponse([
                'message' => 'Ce compte est désactivé. Contactez l\'administrateur.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $this->lexikHandler->onAuthenticationSuccess($request, $token);
    }
}
