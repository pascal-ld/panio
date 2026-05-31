<?php

namespace App\Service;

use App\Entity\CustomerOrder;
use App\Entity\DistributionPoint;
use App\Entity\OrderLine;
use App\Entity\Product;
use App\Entity\User;
use App\Enum\OrderStatus;
use App\Repository\CustomerOrderRepository;
use App\Repository\DistributionPointRepository;
use App\Repository\ProductRepository;
use Doctrine\ORM\EntityManagerInterface;

final class OrderManager
{
    private const TIMEZONE = 'Europe/Paris';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CustomerOrderRepository $orderRepository,
        private readonly DistributionPointRepository $pointRepository,
        private readonly ProductRepository $productRepository,
        private readonly OrderDeadlineCalculator $deadlineCalculator,
        private readonly CollectionDateResolver $collectionDateResolver,
        private readonly OrderPreparedMailer $orderPreparedMailer,
        private readonly OrderAbsentMailer $orderAbsentMailer,
    ) {
    }

    /**
     * @param list<array{productId: int, quantity: int}> $lines
     */
    public function saveDraft(
        User $client,
        User $producer,
        int $distributionPointId,
        string $collectionDate,
        array $lines,
        bool $reserve = false,
    ): CustomerOrder {
        $now = $this->now();
        $collection = $this->parseCollectionDate($collectionDate);
        $point = $this->resolveDistributionPoint($producer, $distributionPointId);
        $deadline = $this->deadlineCalculator->compute($collection, $point);

        if ($now > $deadline) {
            throw new \InvalidArgumentException('Le délai de commande est dépassé pour ce créneau.');
        }

        $this->assertSlotAvailable($producer, $collection, $point, $now);

        $filteredLines = array_values(array_filter(
            $lines,
            static fn (array $line) => ($line['quantity'] ?? 0) > 0,
        ));

        if ($filteredLines === []) {
            throw new \InvalidArgumentException('Ajoutez au moins un produit à la commande.');
        }

        $order = $this->orderRepository->findActiveForSlot(
            $client,
            $producer,
            $distributionPointId,
            $collection,
        );

        if ($order === null) {
            $order = new CustomerOrder();
            $order->setClient($client);
            $order->setProducer($producer);
            $order->setDistributionPoint($point);
            $order->setCollectionDate($collection);
            $order->setStatus(OrderStatus::Draft);
            $this->entityManager->persist($order);
        } elseif (!$order->getStatus()->isEditableByClient()) {
            throw new \InvalidArgumentException('Cette commande ne peut plus être modifiée.');
        }

        $this->assertSlotCapacityAvailable($producer, $collection, $point, $order->getId());

        if ($now > ($order->getOrderDeadlineAt() ?? $deadline)) {
            throw new \InvalidArgumentException('Le délai de commande est dépassé.');
        }

        $isNextReservableSlot = $this->isNextReservableDate($producer, $collection, $now);
        $reservedByProduct = $isNextReservableSlot
            ? $this->orderRepository->aggregateReservedQuantitiesForDate($producer, $collection, $order->getId())
            : [];

        $order->setOrderDeadlineAt($deadline);
        $order->clearLines();

        foreach ($filteredLines as $lineData) {
            $product = $this->productRepository->find($lineData['productId'] ?? 0);
            if ($product === null || $product->getProducer()?->getId() !== $producer->getId()) {
                throw new \InvalidArgumentException('Produit invalide.');
            }

            if (!$product->isAvailable()) {
                throw new \InvalidArgumentException('Ce produit n\'est pas disponible à la vente.');
            }

            if ($isNextReservableSlot) {
                $this->assertNextSlotStockAvailable(
                    $product,
                    (int) $lineData['quantity'],
                    $reservedByProduct,
                );
            }

            $saleUnit = $product->getSaleUnit();
            if ($saleUnit === null) {
                throw new \InvalidArgumentException('Produit invalide.');
            }

            $line = new OrderLine();
            $line->setProduct($product);
            $line->setProductName($product->getName() ?? '');
            $line->setQuantity((int) $lineData['quantity']);
            $line->setUnitPrice($product->getPrice() ?? '0');
            $line->setSaleUnit($saleUnit);
            $order->addLine($line);
        }

        if ($reserve) {
            $order->setStatus(OrderStatus::Reserved);
        } elseif ($order->getStatus() === OrderStatus::Reserved) {
            // keep reserved when updating lines
        } else {
            $order->setStatus(OrderStatus::Draft);
        }

        $order->touch();
        $this->entityManager->flush();

        return $order;
    }

    public function reserve(User $client, CustomerOrder $order): CustomerOrder
    {
        $this->assertClientOwnsOrder($client, $order);
        $this->assertBeforeDeadline($order);

        if ($order->getLines()->isEmpty()) {
            throw new \InvalidArgumentException('La commande est vide.');
        }

        if (!$order->getStatus()->isEditableByClient()) {
            throw new \InvalidArgumentException('Cette commande ne peut plus être réservée.');
        }

        $order->setStatus(OrderStatus::Reserved);
        $order->touch();
        $this->entityManager->flush();

        return $order;
    }

    public function cancel(User $client, CustomerOrder $order): CustomerOrder
    {
        $this->assertClientOwnsOrder($client, $order);
        $this->assertBeforeDeadline($order);

        if (!$order->getStatus()->isEditableByClient()) {
            throw new \InvalidArgumentException('Cette commande ne peut plus être annulée.');
        }

        $order->setStatus(OrderStatus::Cancelled);
        $order->touch();
        $this->entityManager->flush();

        return $order;
    }

    public function updateProducerStatus(
        User $producer,
        CustomerOrder $order,
        OrderStatus $newStatus,
        ?string $producerComment = null,
    ): CustomerOrder {
        if ($order->getProducer()?->getId() !== $producer->getId()) {
            throw new \InvalidArgumentException('Commande introuvable.');
        }

        $current = $order->getStatus();

        $allowed = match ($newStatus) {
            OrderStatus::Prepared => $current === OrderStatus::Reserved,
            OrderStatus::Retrieved => in_array($current, [OrderStatus::Prepared, OrderStatus::Absent], true),
            default => false,
        };

        if (!$allowed) {
            throw new \InvalidArgumentException(sprintf(
                'Impossible de passer de « %s » à « %s ».',
                $current->label(),
                $newStatus->label(),
            ));
        }

        $order->setStatus($newStatus);
        if ($newStatus === OrderStatus::Prepared) {
            $trimmedComment = trim((string) $producerComment);
            $order->setProducerComment($trimmedComment !== '' ? $trimmedComment : null);
        }
        $order->touch();
        $this->entityManager->flush();
        if ($newStatus === OrderStatus::Prepared) {
            $this->orderPreparedMailer->send($order);
        }

        return $order;
    }

    public function updateAdminStatus(CustomerOrder $order, OrderStatus $newStatus): CustomerOrder
    {
        if ($order->getStatus() === $newStatus) {
            return $order;
        }

        $order->setStatus($newStatus);
        $order->touch();
        $this->entityManager->flush();

        return $order;
    }

    public function markAbsentOrders(): int
    {
        $today = $this->now()->setTime(0, 0, 0);
        // J+2: au lancement du jour J, les commandes du jour J-2 passent en absent.
        $thresholdExclusive = $today->modify('-1 day');
        $orders = $this->orderRepository->findOrdersToMarkAbsent($thresholdExclusive);
        $count = 0;

        foreach ($orders as $order) {
            $order->setStatus(OrderStatus::Absent);
            $order->touch();
            ++$count;
        }

        if ($count > 0) {
            $this->entityManager->flush();
            foreach ($orders as $order) {
                try {
                    $this->orderAbsentMailer->send($order);
                } catch (\Throwable) {
                    // Ne bloque pas la commande CRON si un e-mail échoue ponctuellement.
                }
            }
        }

        return $count;
    }

    private function assertClientOwnsOrder(User $client, CustomerOrder $order): void
    {
        if ($order->getClient()?->getId() !== $client->getId()) {
            throw new \InvalidArgumentException('Commande introuvable.');
        }
    }

    private function assertBeforeDeadline(CustomerOrder $order): void
    {
        $deadline = $order->getOrderDeadlineAt();
        if ($deadline !== null && $this->now() > $deadline) {
            throw new \InvalidArgumentException('Le délai de commande est dépassé.');
        }
    }

    private function resolveDistributionPoint(User $producer, int $pointId): DistributionPoint
    {
        $point = $this->pointRepository->findOneBy(['id' => $pointId, 'producer' => $producer]);
        if ($point === null) {
            throw new \InvalidArgumentException('Lieu de collecte invalide.');
        }

        return $point;
    }

    private function assertSlotAvailable(
        User $producer,
        \DateTimeImmutable $collection,
        DistributionPoint $point,
        \DateTimeImmutable $now,
    ): void {
        $slots = $this->collectionDateResolver->getAvailableSlots($producer, $now);
        $pointId = $point->getId();
        $dateStr = $collection->format('Y-m-d');

        foreach ($slots as $slot) {
            if ($slot['date'] === $dateStr && $slot['distributionPointId'] === $pointId) {
                return;
            }
        }

        throw new \InvalidArgumentException('Ce créneau de collecte n\'est pas disponible.');
    }

    private function assertSlotCapacityAvailable(
        User $producer,
        \DateTimeImmutable $collectionDate,
        DistributionPoint $point,
        ?int $excludeOrderId = null,
    ): void {
        $maxBaskets = $point->getMaxBaskets();
        if ($maxBaskets === null) {
            return;
        }

        $pointId = $point->getId();
        if ($pointId === null) {
            return;
        }

        $count = $this->orderRepository->countBySlot($producer, $collectionDate, $pointId, $excludeOrderId);
        if ($count >= $maxBaskets) {
            throw new \InvalidArgumentException('Le nombre maximum de paniers est atteint pour ce lieu de distribution.');
        }
    }

    private function parseCollectionDate(string $value): \DateTimeImmutable
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value, new \DateTimeZone(self::TIMEZONE));
        if ($date === false) {
            throw new \InvalidArgumentException('Date de collecte invalide.');
        }

        return $date;
    }

    private function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone(self::TIMEZONE));
    }

    private function isNextReservableDate(
        User $producer,
        \DateTimeImmutable $collectionDate,
        \DateTimeImmutable $now,
    ): bool {
        $slots = $this->collectionDateResolver->getAvailableSlots($producer, $now);
        if ($slots === []) {
            return false;
        }

        $firstDate = (string) ($slots[0]['date'] ?? '');
        $nextDate = \DateTimeImmutable::createFromFormat('!Y-m-d', $firstDate, new \DateTimeZone(self::TIMEZONE));
        if ($nextDate === false) {
            return false;
        }

        return $collectionDate->format('Y-m-d') === $nextDate->format('Y-m-d');
    }

    /**
     * @param array<int, int> $reservedByProduct
     */
    private function assertNextSlotStockAvailable(Product $product, int $requestedQty, array $reservedByProduct): void
    {
        $max = $product->getNextSlotMaxQuantity();
        if ($max === null) {
            return;
        }

        $productId = $product->getId();
        $reserved = $productId !== null ? ($reservedByProduct[$productId] ?? 0) : 0;
        $remaining = max(0, $max - $reserved);

        if ($requestedQty > $remaining) {
            throw new \InvalidArgumentException(sprintf(
                'Stock insuffisant pour « %s » sur le prochain créneau (%d restant%s).',
                $product->getName() ?? 'ce produit',
                $remaining,
                $remaining < 3 ? ', proche rupture' : '',
            ));
        }
    }
}
