<?php

namespace App\Service;

use App\Entity\User;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class AccountVerificationMailer
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly string $frontendUrl,
        private readonly string $mailerFrom,
    ) {
    }

    public function send(User $user, string $token): void
    {
        $verifyUrl = rtrim($this->frontendUrl, '/').'/inscription/valider?token='.urlencode($token);

        $email = (new Email())
            ->from(Address::create($this->mailerFrom))
            ->to($user->getEmail())
            ->subject('Confirmez votre compte Panio')
            ->text($this->buildTextBody($user, $verifyUrl))
            ->html($this->buildHtmlBody($user, $verifyUrl));

        $this->mailer->send($email);
    }

    private function greeting(User $user): string
    {
        $name = $user->getFullName();

        return $name !== null && $name !== '' ? "Bonjour {$name}," : 'Bonjour,';
    }

    private function buildTextBody(User $user, string $verifyUrl): string
    {
        $greeting = $this->greeting($user);

        return <<<TEXT
        {$greeting}

        Merci de votre inscription sur Panio.

        Pour activer votre compte, ouvrez le lien suivant (valable 48 heures) :
        {$verifyUrl}

        Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.

        L'équipe Panio
        TEXT;
    }

    private function buildHtmlBody(User $user, string $verifyUrl): string
    {
        $escapedUrl = htmlspecialchars($verifyUrl, ENT_QUOTES, 'UTF-8');
        $greeting = htmlspecialchars($this->greeting($user), ENT_QUOTES, 'UTF-8');

        return <<<HTML
        <p>{$greeting}</p>
        <p>Merci de votre inscription sur <strong>Panio</strong>.</p>
        <p>Pour activer votre compte, cliquez sur le lien ci-dessous (valable 48&nbsp;heures)&nbsp;:</p>
        <p><a href="{$escapedUrl}">Confirmer mon compte</a></p>
        <p style="word-break:break-all;font-size:14px;color:#555;">{$escapedUrl}</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
        <p>L'équipe Panio</p>
        HTML;
    }
}
