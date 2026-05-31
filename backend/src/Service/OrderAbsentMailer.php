<?php

namespace App\Service;

use App\Entity\CustomerOrder;
use App\Entity\OrderLine;
use App\Entity\User;
use App\Util\FrenchDecimal;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class OrderAbsentMailer
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
        $producer = $order->getProducer();
        if (!$client instanceof User || !$producer instanceof User) {
            return;
        }

        $producerName = $producer->getFullName() ?: 'votre producteur';
        $producerEmail = (string) ($producer->getEmail() ?? '');
        $producerPhone = $producer->getPhone();
        $collectionDate = $order->getCollectionDate()?->format('d/m/Y') ?? '';
        $pointLabel = $order->getDistributionPoint()?->getLocationLabel() ?? 'votre point de retrait';
        $commandsUrl = rtrim($this->frontendUrl, '/').'/client/commandes';
        $greeting = $this->greeting($client);
        $producerPhotoPath = $producer->getProducerPhotoPath();
        $producerPhotoUrl = $producerPhotoPath
            ? rtrim($this->backendUrl, '/').$producerPhotoPath
            : rtrim($this->frontendUrl, '/').'/panio-logo-email.svg';

        $email = (new Email())
            ->from(Address::create($this->mailerFrom))
            ->to((string) $client->getEmail())
            ->subject(sprintf('Panio - Commande non récupérée (%s - %s)', $collectionDate, $pointLabel))
            ->text($this->buildTextBody(
                $order,
                $greeting,
                $producerName,
                $collectionDate,
                $pointLabel,
                $producerEmail,
                $producerPhone,
                $commandsUrl,
            ))
            ->html($this->buildHtmlBody(
                $order,
                $greeting,
                $producerName,
                $collectionDate,
                $pointLabel,
                $producerEmail,
                $producerPhone,
                $commandsUrl,
                $producerPhotoUrl,
            ));

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
        string $pointLabel,
        string $producerEmail,
        ?string $producerPhone,
        string $commandsUrl,
    ): string {
        $lineRows = [];
        foreach ($order->getLines() as $line) {
            if ($line->getQuantity() <= 0) {
                continue;
            }
            $unit = $line->getSaleUnit()?->label() ?? 'unité';
            $unitPrice = FrenchDecimal::format($line->getUnitPrice() ?? '0');
            $lineRows[] = sprintf(
                '- %s x %d %s (%s / %s)',
                $line->getProductName(),
                $line->getQuantity(),
                $unit,
                $unitPrice,
                $unit,
            );
        }
        $details = $lineRows !== [] ? implode("\n", $lineRows) : '- Votre panier';
        $phoneLine = $producerPhone ? "\n- Téléphone : {$producerPhone}" : '';

        return <<<TEXT
        {$greeting}

        Vous n'êtes pas venu récupérer votre panier prévu le {$collectionDate} ({$pointLabel}).
        La commande est maintenant marquée comme absente.

        Merci de contacter rapidement {$producerName} :
        - E-mail : {$producerEmail}{$phoneLine}

        Détail de la commande :
        {$details}

        Voir mes commandes : {$commandsUrl}

        L'équipe Panio
        TEXT;
    }

    private function buildHtmlBody(
        CustomerOrder $order,
        string $greeting,
        string $producerName,
        string $collectionDate,
        string $pointLabel,
        string $producerEmail,
        ?string $producerPhone,
        string $commandsUrl,
        string $producerPhotoUrl,
    ): string {
        $greetingEscaped = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
        $producerEscaped = htmlspecialchars($producerName, ENT_QUOTES, 'UTF-8');
        $dateEscaped = htmlspecialchars($collectionDate, ENT_QUOTES, 'UTF-8');
        $pointEscaped = htmlspecialchars($pointLabel, ENT_QUOTES, 'UTF-8');
        $emailEscaped = htmlspecialchars($producerEmail, ENT_QUOTES, 'UTF-8');
        $mailToEscaped = htmlspecialchars('mailto:'.$producerEmail, ENT_QUOTES, 'UTF-8');
        $phoneEscaped = $producerPhone ? htmlspecialchars($producerPhone, ENT_QUOTES, 'UTF-8') : null;
        $telEscaped = $producerPhone ? htmlspecialchars('tel:'.preg_replace('/[^\d+]/', '', $producerPhone), ENT_QUOTES, 'UTF-8') : null;
        $commandsUrlEscaped = htmlspecialchars($commandsUrl, ENT_QUOTES, 'UTF-8');
        $logoUrlEscaped = htmlspecialchars(rtrim($this->frontendUrl, '/').'/panio-logo-email.svg', ENT_QUOTES, 'UTF-8');
        $producerPhotoEscaped = htmlspecialchars($producerPhotoUrl, ENT_QUOTES, 'UTF-8');
        $rows = $this->buildProductRows($order);
        $phoneHtml = $phoneEscaped !== null && $telEscaped !== null
            ? "<li>Téléphone : <a href=\"{$telEscaped}\" style=\"color:#2d6a4f;text-decoration:underline;\">{$phoneEscaped}</a></li>"
            : '';

        return <<<HTML
        <div style="font-family:Arial,sans-serif;line-height:1.45;color:#1f2937;">
          <div style="margin-bottom:16px;">
            <img src="{$logoUrlEscaped}" alt="Panio" width="120" style="display:block;height:auto;" />
          </div>
          <p>{$greetingEscaped}</p>
          <div style="margin:16px 0;padding:12px;border:1px solid #fee2e2;border-radius:10px;background:#fef2f2;">
            <p style="margin:0;">
              Vous n'êtes pas venu récupérer votre panier prévu le <strong>{$dateEscaped}</strong>
              ({$pointEscaped}).<br/>
              La commande est maintenant marquée comme absente.
            </p>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 4px;">
            <tr>
              <td style="width:56px;vertical-align:middle;">
                <img src="{$producerPhotoEscaped}" alt="" width="48" height="48" style="display:block;border-radius:9999px;object-fit:cover;background:#f3f4f6;" />
              </td>
              <td style="padding-left:8px;vertical-align:middle;">
                <strong>{$producerEscaped}</strong><br/>
                <span style="font-size:13px;color:#4b5563;">Votre producteur à contacter rapidement</span>
              </td>
            </tr>
          </table>
          <p style="margin-top:10px;">Coordonnées de contact :</p>
          <ul>
            <li>E-mail : <a href="{$mailToEscaped}" style="color:#2d6a4f;text-decoration:underline;">{$emailEscaped}</a></li>
            {$phoneHtml}
          </ul>
          <p style="margin:16px 0 8px;"><strong>Détail de votre commande</strong></p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            {$rows}
          </table>
          <p>
            <a href="{$commandsUrlEscaped}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
              Voir mes commandes
            </a>
          </p>
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
        $qty = $line->getQuantity();
        $unitLabel = htmlspecialchars($line->getSaleUnit()?->label() ?? 'unité', ENT_QUOTES, 'UTF-8');
        $unitPrice = htmlspecialchars(FrenchDecimal::format($line->getUnitPrice() ?? '0'), ENT_QUOTES, 'UTF-8');
        $lineTotal = htmlspecialchars(FrenchDecimal::format(number_format((float) ($line->getUnitPrice() ?? '0') * $qty, 2, '.', '')), ENT_QUOTES, 'UTF-8');
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
            <div style="font-size:13px;color:#4b5563;">{$qty} {$unitLabel} · {$unitPrice} / {$unitLabel} · Total {$lineTotal}</div>
          </td>
        </tr>
        HTML;
    }
}
