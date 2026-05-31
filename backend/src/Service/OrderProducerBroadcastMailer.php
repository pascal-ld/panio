<?php

namespace App\Service;

use App\Entity\CustomerOrder;
use App\Entity\User;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class OrderProducerBroadcastMailer
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly string $frontendUrl,
        private readonly string $mailerFrom,
    ) {
    }

    public function send(CustomerOrder $order, string $message): void
    {
        $client = $order->getClient();
        $producer = $order->getProducer();
        if (!$client instanceof User || !$producer instanceof User) {
            return;
        }

        $collectionDate = $order->getCollectionDate()?->format('d/m/Y') ?? '';
        $pointLabel = $order->getDistributionPoint()?->getLocationLabel() ?? 'votre point de retrait';
        $producerName = $producer->getFullName() ?: 'Le producteur';
        $commandsUrl = rtrim($this->frontendUrl, '/').'/client/commandes';

        $greeting = $this->greeting($client);
        $safeMessage = trim($message);
        $subject = sprintf('Panio - Message du producteur (%s - %s)', $collectionDate, $pointLabel);

        $email = (new Email())
            ->from(Address::create($this->mailerFrom))
            ->to((string) $client->getEmail())
            ->subject($subject)
            ->text($this->buildTextBody($greeting, $producerName, $collectionDate, $pointLabel, $safeMessage, $commandsUrl))
            ->html($this->buildHtmlBody($greeting, $producerName, $collectionDate, $pointLabel, $safeMessage, $commandsUrl));

        $this->mailer->send($email);
    }

    private function greeting(User $user): string
    {
        $name = $user->getFullName();

        return $name !== null && $name !== '' ? "Bonjour {$name}," : 'Bonjour,';
    }

    private function buildTextBody(
        string $greeting,
        string $producerName,
        string $collectionDate,
        string $pointLabel,
        string $message,
        string $commandsUrl,
    ): string {
        return <<<TEXT
        {$greeting}

        {$producerName} vous envoie un message concernant la livraison de votre panier
        du {$collectionDate} au lieu de distribution « {$pointLabel} ».

        Message :
        {$message}

        Voir mes commandes : {$commandsUrl}

        L'équipe Panio
        TEXT;
    }

    private function buildHtmlBody(
        string $greeting,
        string $producerName,
        string $collectionDate,
        string $pointLabel,
        string $message,
        string $commandsUrl,
    ): string {
        $greetingEscaped = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
        $producerEscaped = htmlspecialchars($producerName, ENT_QUOTES, 'UTF-8');
        $dateEscaped = htmlspecialchars($collectionDate, ENT_QUOTES, 'UTF-8');
        $pointEscaped = htmlspecialchars($pointLabel, ENT_QUOTES, 'UTF-8');
        $messageEscaped = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));
        $commandsUrlEscaped = htmlspecialchars($commandsUrl, ENT_QUOTES, 'UTF-8');
        $logoUrlEscaped = htmlspecialchars(rtrim($this->frontendUrl, '/').'/panio-logo-email.svg', ENT_QUOTES, 'UTF-8');

        return <<<HTML
        <div style="font-family:Arial,sans-serif;line-height:1.45;color:#1f2937;">
          <div style="margin-bottom:16px;">
            <img src="{$logoUrlEscaped}" alt="Panio" width="120" style="display:block;height:auto;" />
          </div>
          <p>{$greetingEscaped}</p>
          <p>
            <strong>{$producerEscaped}</strong> vous envoie un message concernant la livraison
            de votre panier du <strong>{$dateEscaped}</strong> au lieu de distribution
            <strong>{$pointEscaped}</strong>.
          </p>
          <div style="margin:16px 0;padding:12px;border:1px solid #d1fae5;border-radius:10px;background:#ecfdf5;">
            <p style="margin:0 0 8px;"><strong>Message du producteur</strong></p>
            <p style="margin:0;">{$messageEscaped}</p>
          </div>
          <p>
            <a href="{$commandsUrlEscaped}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
              Voir mes commandes
            </a>
          </p>
          <p>L'équipe Panio</p>
        </div>
        HTML;
    }
}
