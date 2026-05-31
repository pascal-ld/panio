<?php

namespace App\Serializer;

use App\Entity\CustomerOrder;
use App\Entity\OrderLine;
use App\Enum\OrderStatus;
use App\Util\FrenchDateFormatter;
use App\Util\FrenchDecimal;

final class OrderSerializer
{
    /**
     * @return array<string, mixed>
     */
    public function serialize(CustomerOrder $order, bool $includeClient = false): array
    {
        $point = $order->getDistributionPoint();
        $producer = $order->getProducer();
        $client = $order->getClient();
        $status = $order->getStatus();
        $deadline = $order->getOrderDeadlineAt();
        $now = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris'));

        $data = [
            'id' => $order->getId(),
            'status' => $status->value,
            'statusLabel' => $status->label(),
            'collectionDate' => $order->getCollectionDate()?->format('Y-m-d'),
            'collectionDateLabel' => $order->getCollectionDate() !== null
                ? FrenchDateFormatter::formatDate($order->getCollectionDate())
                : null,
            'orderDeadlineAt' => $deadline?->format(\DateTimeInterface::ATOM),
            'canEdit' => $status->isEditableByClient() && ($deadline === null || $now <= $deadline),
            'canCancel' => $status->isEditableByClient() && ($deadline === null || $now <= $deadline),
            'distributionPoint' => $point ? [
                'id' => $point->getId(),
                'locationLabel' => $point->getLocationLabel(),
            ] : null,
            'producer' => $producer ? [
                'id' => $producer->getId(),
                'fullName' => $producer->getFullName(),
                'slug' => $producer->getSlug(),
            ] : null,
            'lines' => array_map(
                fn (OrderLine $line) => $this->serializeLine($line),
                $order->getLines()->toArray(),
            ),
            'producerComment' => $order->getProducerComment(),
            'totalFormatted' => FrenchDecimal::format($this->computeTotal($order)),
            'updatedAt' => $order->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
        ];

        if ($includeClient && $client !== null) {
            $data['client'] = [
                'id' => $client->getId(),
                'fullName' => $client->getFullName(),
                'email' => $client->getEmail(),
                'phone' => $client->getPhone(),
            ];
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeLine(OrderLine $line): array
    {
        $saleUnit = $line->getSaleUnit();
        $qty = $line->getQuantity();
        $unitPrice = $line->getUnitPrice() ?? '0';
        $lineTotal = number_format((float) $unitPrice * $qty, 2, '.', '');

        return [
            'productId' => $line->getProduct()?->getId(),
            'productName' => $line->getProductName(),
            'quantity' => $qty,
            'unitPrice' => $unitPrice,
            'unitPriceFormatted' => FrenchDecimal::format($unitPrice),
            'lineTotalFormatted' => FrenchDecimal::format($lineTotal),
            'saleUnit' => $saleUnit?->value,
            'saleUnitLabel' => $saleUnit?->label(),
            'photoUrl' => $line->getProduct()?->getPhotoPath(),
        ];
    }

    private function computeTotal(CustomerOrder $order): string
    {
        $total = 0.0;
        foreach ($order->getLines() as $line) {
            $total += (float) ($line->getUnitPrice() ?? '0') * $line->getQuantity();
        }

        return number_format($total, 2, '.', '');
    }
}
