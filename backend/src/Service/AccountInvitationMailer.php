<?php

namespace App\Service;

use App\Entity\User;
use App\Enum\UserRole;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class AccountInvitationMailer
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly string $frontendUrl,
        private readonly string $mailerFrom,
    ) {
    }

    public function send(User $user, string $token): void
    {
        $setupUrl = rtrim($this->frontendUrl, '/').'/invitation/mot-de-passe?token='.urlencode($token);
        $greeting = $this->greeting($user);
        $roleIntro = $this->roleIntro($user);
        $validityDays = PasswordSetupService::INVITATION_TTL_DAYS;

        $email = (new Email())
            ->from(Address::create($this->mailerFrom))
            ->to((string) $user->getEmail())
            ->subject('Panio - Créez votre mot de passe')
            ->text($this->buildTextBody($greeting, $roleIntro, $setupUrl, $validityDays))
            ->html($this->buildHtmlBody($greeting, $roleIntro, $setupUrl, $validityDays));

        $this->mailer->send($email);
    }

    private function greeting(User $user): string
    {
        $name = $user->getFullName();

        return $name !== null && $name !== '' ? "Bonjour {$name}," : 'Bonjour,';
    }

    private function roleIntro(User $user): string
    {
        return match ($user->getRole()) {
            UserRole::Producteur => 'Un compte producteur Panio a été créé pour vous.',
            UserRole::SuperAdmin => 'Un compte administrateur Panio a été créé pour vous.',
            default => 'Un compte client Panio a été créé pour vous.',
        };
    }

    private function buildTextBody(string $greeting, string $roleIntro, string $setupUrl, int $validityDays): string
    {
        return <<<TEXT
        {$greeting}

        {$roleIntro}

        Pour accéder à Panio, créez votre mot de passe via le lien suivant (valable {$validityDays} jours) :
        {$setupUrl}

        Si vous n'êtes pas concerné(e), ignorez ce message.

        L'équipe Panio
        TEXT;
    }

    private function buildHtmlBody(string $greeting, string $roleIntro, string $setupUrl, int $validityDays): string
    {
        $logoUrl = rtrim($this->frontendUrl, '/').'/panio-logo-email.svg';
        $escapedUrl = htmlspecialchars($setupUrl, ENT_QUOTES, 'UTF-8');
        $escapedGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
        $escapedIntro = htmlspecialchars($roleIntro, ENT_QUOTES, 'UTF-8');

        return <<<HTML
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;max-width:560px;margin:0 auto;">
          <p style="text-align:center;margin:0 0 24px;"><img src="{$logoUrl}" alt="Panio" width="120" style="display:inline-block;" /></p>
          <p>{$escapedGreeting}</p>
          <p>{$escapedIntro}</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir votre mot de passe (lien valable {$validityDays}&nbsp;jours)&nbsp;:</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="{$escapedUrl}" style="display:inline-block;background:#2d5016;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;">Créer mon mot de passe</a>
          </p>
          <p style="word-break:break-all;font-size:14px;color:#6b7280;">{$escapedUrl}</p>
          <p style="font-size:14px;color:#6b7280;">Si vous n'êtes pas concerné(e), ignorez ce message.</p>
          <p>L'équipe Panio</p>
        </div>
        HTML;
    }
}
