<?php

namespace App\Service;

use App\Entity\CustomerOrder;
use App\Entity\OrderLine;
use App\Entity\User;
use App\Util\FrenchDecimal;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class OrderPreparedMailer
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly string $frontendUrl,
        private readonly string $backendUrl,
        private readonly string $mailerFrom,
    ) {
    }

    public function send(CustomerOrder $order): void
    {
        $client = $order->getClient();
        if (!$client instanceof User) {
            return;
        }

        $distributionPoint = $order->getDistributionPoint();
        $location = $distributionPoint?->getLocationLabel() ?? 'votre point de retrait';
        $start = $distributionPoint?->getDistributionStartTime()?->format('H:i') ?? '';
        $end = $distributionPoint?->getDistributionEndTime()?->format('H:i') ?? '';
        $slotLabel = $start !== '' && $end !== '' ? "entre {$start} et {$end}" : 'aux horaires habituels';
        $collectionDate = $order->getCollectionDate()?->format('d/m/Y') ?? '';
        $producerName = $order->getProducer()?->getFullName() ?: 'votre producteur';
        $greeting = $this->greeting($client);
        $commandsUrl = rtrim($this->frontendUrl, '/').'/client/commandes';
        $producerComment = trim((string) ($order->getProducerComment() ?? ''));

        $email = (new Email())
            ->from(Address::create($this->mailerFrom))
            ->to((string) $client->getEmail())
            ->subject(sprintf('Panio - Votre panier est prêt (%s)', $collectionDate))
            ->text($this->buildTextBody($order, $greeting, $producerName, $collectionDate, $location, $slotLabel, $commandsUrl, $producerComment))
            ->html($this->buildHtmlBody($order, $greeting, $producerName, $collectionDate, $location, $slotLabel, $commandsUrl, $producerComment));

        $this->mailer->send($email);
    }

    private function greeting(User $user): string
    {
        $name = $user->getFullName();

        return $name !== null && $name !== '' ? "Bonjour {$name}," : 'Bonjour,';
    }

    private function buildTextBody(
        CustomerOrder $order,
        string $greeting,
        string $producerName,
        string $collectionDate,
        string $location,
        string $slotLabel,
        string $commandsUrl,
        string $producerComment,
    ): string {
        $lines = [];
        foreach ($order->getLines() as $line) {
            $qty = $line->getQuantity();
            if ($qty <= 0) {
                continue;
            }
            $unitLabel = $line->getSaleUnit()?->label() ?? 'unité';
            $unitPrice = FrenchDecimal::format($line->getUnitPrice() ?? '0');
            $lines[] = sprintf('- %s x %d %s (%s / %s)', $line->getProductName(), $qty, $unitLabel, $unitPrice, $unitLabel);
        }

        $lineBlock = $lines !== [] ? implode("\n", $lines) : '- Votre panier';

        $producerCommentLabel = $producerComment !== '' ? $producerComment : 'Aucun message complémentaire.';

        return <<<TEXT
        {$greeting}

        Bonne nouvelle : votre panier chez {$producerName} est prêt.

        Rappel retrait :
        - Date : {$collectionDate}
        - Lieu : {$location}
        - Horaire : {$slotLabel}

        Contenu du panier :
        {$lineBlock}

        Message du producteur :
        {$producerCommentLabel}

        Pensez à venir le récupérer aujourd'hui.

        Voir ma commande : {$commandsUrl}

        L'équipe Panio
        TEXT;
    }

    private function buildHtmlBody(
        CustomerOrder $order,
        string $greeting,
        string $producerName,
        string $collectionDate,
        string $location,
        string $slotLabel,
        string $commandsUrl,
        string $producerComment,
    ): string {
        $greetingEscaped = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
        $producerEscaped = htmlspecialchars($producerName, ENT_QUOTES, 'UTF-8');
        $dateEscaped = htmlspecialchars($collectionDate, ENT_QUOTES, 'UTF-8');
        $locationEscaped = htmlspecialchars($location, ENT_QUOTES, 'UTF-8');
        $slotEscaped = htmlspecialchars($slotLabel, ENT_QUOTES, 'UTF-8');
        $commandsUrlEscaped = htmlspecialchars($commandsUrl, ENT_QUOTES, 'UTF-8');
        $logoUrlEscaped = htmlspecialchars(rtrim($this->frontendUrl, '/').'/panio-logo-email.svg', ENT_QUOTES, 'UTF-8');
        $rows = $this->buildProductRows($order);
        $commentEscaped = htmlspecialchars($producerComment, ENT_QUOTES, 'UTF-8');
        $commentHtml = $producerComment !== ''
            ? '<div style="margin:16px 0;padding:12px;border:1px solid #bbf7d0;border-radius:10px;background:#f0fdf4;">'
                .'<p style="margin:0 0 6px;"><strong>Message du producteur</strong></p>'
                .'<p style="margin:0;">'.$commentEscaped.'</p>'
            .'</div>'
            : '';

        return <<<HTML
        <div style="font-family:Arial,sans-serif;line-height:1.45;color:#1f2937;">
          <div style="margin-bottom:16px;">
            <img src="{$logoUrlEscaped}" alt="Panio" width="120" style="display:block;height:auto;" />
          </div>
          <p>{$greetingEscaped}</p>
          <p>Bonne nouvelle&nbsp;: votre panier chez <strong>{$producerEscaped}</strong> est prêt.</p>

          <div style="margin:16px 0;padding:12px;border:1px solid #d1fae5;border-radius:10px;background:#ecfdf5;">
            <p style="margin:0 0 8px;"><strong>Rappel retrait</strong></p>
            <p style="margin:0;">Date&nbsp;: {$dateEscaped}<br/>Lieu&nbsp;: {$locationEscaped}<br/>Horaire&nbsp;: {$slotEscaped}</p>
          </div>

          <p style="margin:16px 0 8px;"><strong>Votre panier</strong></p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            {$rows}
          </table>

          {$commentHtml}

          <p style="margin:20px 0;">
            <a href="{$commandsUrlEscaped}" style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
              Voir ma commande
            </a>
          </p>

          <p>Pensez à venir le récupérer aujourd'hui.</p>
          <p>L'équipe Panio</p>
        </div>
        HTML;
    }

    private function buildProductRows(CustomerOrder $order): string
    {
        $rows = [];
        foreach ($order->getLines() as $line) {
            if ($line->getQuantity() <= 0) {
                continue;
            }

            $rows[] = $this->buildProductRow($line);
        }

        if ($rows === []) {
            return '<tr><td style="padding:10px;border-top:1px solid #e5e7eb;">Votre panier</td></tr>';
        }

        return implode('', $rows);
    }

    private function buildProductRow(OrderLine $line): string
    {
        $name = htmlspecialchars((string) $line->getProductName(), ENT_QUOTES, 'UTF-8');
        $unitLabel = htmlspecialchars($line->getSaleUnit()?->label() ?? 'unité', ENT_QUOTES, 'UTF-8');
        $qty = $line->getQuantity();
        $unitPrice = htmlspecialchars(FrenchDecimal::format($line->getUnitPrice() ?? '0'), ENT_QUOTES, 'UTF-8');
        $photoPath = $line->getProduct()?->getPhotoPath();
        $photoUrl = $photoPath ? rtrim($this->backendUrl, '/').$photoPath : rtrim($this->frontendUrl, '/').'/panio-logo-email.svg';
        $photoUrlEscaped = htmlspecialchars($photoUrl, ENT_QUOTES, 'UTF-8');

        return <<<HTML
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e5e7eb;width:56px;vertical-align:top;">
            <img src="{$photoUrlEscaped}" alt="" width="48" height="48" style="display:block;border-radius:8px;object-fit:cover;background:#f3f4f6;" />
          </td>
          <td style="padding:8px 0 8px 8px;border-top:1px solid #e5e7eb;vertical-align:top;">
            <div style="font-weight:600;">{$name}</div>
            <div style="font-size:13px;color:#4b5563;">{$qty} {$unitLabel} · {$unitPrice} / {$unitLabel}</div>
          </td>
        </tr>
        HTML;
    }
}
