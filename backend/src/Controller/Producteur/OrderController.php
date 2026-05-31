<?php

namespace App\Controller\Producteur;

use App\Entity\CustomerOrder;
use App\Entity\Product;
use App\Entity\User;
use App\Enum\OrderStatus;
use App\Enum\SaleUnit;
use App\Repository\CustomerOrderRepository;
use App\Repository\ProductRepository;
use App\Repository\UserRepository;
use App\Serializer\OrderSerializer;
use App\Service\CollectionDateResolver;
use App\Service\OrderManager;
use App\Service\OrderProducerBroadcastMailer;
use App\Service\PasswordPolicy;
use App\Util\FrenchDecimal;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/producteur/orders')]
#[IsGranted('ROLE_PRODUCTEUR')]
final class OrderController extends AbstractController
{
    #[Route('', name: 'api_producteur_orders_list', methods: ['GET'])]
    public function list(
        Request $request,
        CustomerOrderRepository $orderRepository,
        OrderSerializer $serializer,
    ): JsonResponse {
        $producer = $this->requireProducer();
        $dateStr = trim((string) $request->query->get('date', ''));
        $statusValue = trim((string) $request->query->get('status', ''));

        if ($dateStr === '') {
            return $this->json(['error' => 'Le paramètre date est requis (Y-m-d).'], Response::HTTP_BAD_REQUEST);
        }

        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $dateStr, new \DateTimeZone('Europe/Paris'));
        if ($date === false) {
            return $this->json(['error' => 'Date invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $status = $statusValue !== '' ? OrderStatus::tryFrom($statusValue) : null;
        if ($statusValue !== '' && $status === null) {
            return $this->json(['error' => 'Statut invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $orders = $orderRepository->findByProducerAndDate($producer, $date, $status);

        return $this->json(array_map(
            fn (CustomerOrder $order) => $serializer->serialize($order, true),
            $orders,
        ));
    }

    #[Route('/dates', name: 'api_producteur_orders_dates', methods: ['GET'])]
    public function dates(
        CustomerOrderRepository $orderRepository,
        CollectionDateResolver $collectionDateResolver,
    ): JsonResponse
    {
        $producer = $this->requireProducer();
        $today = new \DateTimeImmutable('today', new \DateTimeZone('Europe/Paris'));
        $orderDates = $orderRepository->findDistinctCollectionDates($producer);
        $slotDates = array_values(array_unique(array_map(
            static fn (array $slot) => (string) ($slot['date'] ?? ''),
            $collectionDateResolver->getAvailableSlots($producer, $today),
        )));

        $past = array_values(array_filter(
            $orderDates,
            static fn (\DateTimeImmutable $date) => $date < $today,
        ));
        $pastDates = array_map(
            static fn (\DateTimeImmutable $d) => $d->format('Y-m-d'),
            array_slice($past, -2),
        );
        $dates = array_values(array_unique([...$pastDates, ...$slotDates]));
        sort($dates);

        return $this->json($dates);
    }

    #[Route('/harvest', name: 'api_producteur_orders_harvest', methods: ['GET'])]
    public function harvest(Request $request, CustomerOrderRepository $orderRepository): JsonResponse
    {
        $producer = $this->requireProducer();
        $dateStr = trim((string) $request->query->get('date', ''));

        if ($dateStr === '') {
            return $this->json(['error' => 'Le paramètre date est requis (Y-m-d).'], Response::HTTP_BAD_REQUEST);
        }

        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $dateStr, new \DateTimeZone('Europe/Paris'));
        if ($date === false) {
            return $this->json(['error' => 'Date invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $pendingRows = $orderRepository->aggregateHarvestForDate($producer, $date, [OrderStatus::Reserved]);
        $harvestedRows = $orderRepository->aggregateHarvestForDate($producer, $date, [
            OrderStatus::Prepared,
            OrderStatus::Retrieved,
        ]);

        return $this->json([
            'date' => $dateStr,
            'pending' => array_map($this->serializeHarvestRow(...), $pendingRows),
            'harvested' => array_map($this->serializeHarvestRow(...), $harvestedRows),
        ]);
    }

    #[Route('/{id}/status', name: 'api_producteur_orders_status', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        CustomerOrderRepository $orderRepository,
        OrderManager $orderManager,
        OrderSerializer $serializer,
    ): JsonResponse {
        $producer = $this->requireProducer();
        $order = $orderRepository->find($id);

        if ($order === null || $order->getProducer()?->getId() !== $producer->getId()) {
            return $this->json(['error' => 'Commande introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $status = OrderStatus::tryFrom((string) ($data['status'] ?? ''));
        if ($status === null || !in_array($status, [OrderStatus::Prepared, OrderStatus::Retrieved], true)) {
            return $this->json(['error' => 'Statut invalide.'], Response::HTTP_BAD_REQUEST);
        }
        $producerComment = trim((string) ($data['producerComment'] ?? ''));
        if (mb_strlen($producerComment) > 1000) {
            return $this->json(['error' => 'Le commentaire ne doit pas dépasser 1000 caractères.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $order = $orderManager->updateProducerStatus(
                $producer,
                $order,
                $status,
                $status === OrderStatus::Prepared ? $producerComment : null,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($serializer->serialize($order, true));
    }

    #[Route('/broadcast', name: 'api_producteur_orders_broadcast', methods: ['POST'])]
    public function broadcast(
        Request $request,
        CustomerOrderRepository $orderRepository,
        OrderProducerBroadcastMailer $broadcastMailer,
    ): JsonResponse {
        $producer = $this->requireProducer();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $dateStr = trim((string) ($data['date'] ?? ''));
        $message = trim((string) ($data['message'] ?? ''));

        if ($dateStr === '') {
            return $this->json(['error' => 'Le paramètre date est requis.'], Response::HTTP_BAD_REQUEST);
        }
        if ($message === '') {
            return $this->json(['error' => 'Le message est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if (mb_strlen($message) > 1500) {
            return $this->json(['error' => 'Le message ne doit pas dépasser 1500 caractères.'], Response::HTTP_BAD_REQUEST);
        }

        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $dateStr, new \DateTimeZone('Europe/Paris'));
        if ($date === false) {
            return $this->json(['error' => 'Date invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $orders = $orderRepository->findForProducerBroadcast($producer, $date);
        if ($orders === []) {
            return $this->json(['sentCount' => 0]);
        }

        $sentCount = 0;
        foreach ($orders as $order) {
            try {
                $broadcastMailer->send($order, $message);
                ++$sentCount;
            } catch (\Throwable) {
                // On continue les envois restants en cas d'échec ponctuel.
            }
        }

        return $this->json(['sentCount' => $sentCount]);
    }

    #[Route('/clients', name: 'api_producteur_orders_clients', methods: ['GET'])]
    public function clients(Request $request, CustomerOrderRepository $orderRepository): JsonResponse
    {
        $producer = $this->requireProducer();
        $query = trim((string) $request->query->get('q', ''));
        $clients = $orderRepository->findDistinctClientsByProducer($producer, $query);

        return $this->json(array_map(static fn (User $client) => [
            'id' => $client->getId(),
            'fullName' => $client->getFullName(),
            'email' => $client->getEmail(),
            'phone' => $client->getPhone(),
        ], $clients));
    }

    #[Route('/assist-context', name: 'api_producteur_orders_assist_context', methods: ['GET'])]
    public function assistContext(
        Request $request,
        CollectionDateResolver $collectionDateResolver,
        ProductRepository $productRepository,
        CustomerOrderRepository $orderRepository,
    ): JsonResponse {
        $producer = $this->requireProducer();
        $dateStr = trim((string) $request->query->get('date', ''));
        if ($dateStr === '') {
            return $this->json(['error' => 'Le paramètre date est requis.'], Response::HTTP_BAD_REQUEST);
        }

        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $dateStr, new \DateTimeZone('Europe/Paris'));
        if ($date === false) {
            return $this->json(['error' => 'Date invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $slots = $collectionDateResolver->getAvailableSlots($producer);
        $slotsForDate = array_values(array_filter(
            $slots,
            static fn (array $slot) => (string) ($slot['date'] ?? '') === $dateStr,
        ));

        $nextReservableDate = $slots !== [] ? (string) ($slots[0]['date'] ?? '') : null;
        $isNextReservableDate = $nextReservableDate === $dateStr;
        $reservedByProduct = $isNextReservableDate
            ? $orderRepository->aggregateReservedQuantitiesForDate($producer, $date)
            : [];

        $products = array_map(
            fn (Product $product) => $this->serializeAssistedProduct($product, $isNextReservableDate, $reservedByProduct),
            $productRepository->findAvailableByProducer($producer),
        );

        return $this->json([
            'distributionPoints' => array_map(static fn (array $slot) => [
                'id' => (int) ($slot['distributionPointId'] ?? 0),
                'locationLabel' => (string) ($slot['locationLabel'] ?? ''),
            ], $slotsForDate),
            'products' => $products,
            'isNextReservableDate' => $isNextReservableDate,
        ]);
    }

    #[Route('/assisted', name: 'api_producteur_orders_assisted_create', methods: ['POST'])]
    public function createAssistedOrder(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        OrderManager $orderManager,
        OrderSerializer $serializer,
        PasswordPolicy $passwordPolicy,
    ): JsonResponse {
        $producer = $this->requireProducer();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $client = $this->resolveAssistedClient($data, $userRepository, $passwordHasher, $entityManager, $passwordPolicy);
        if ($client instanceof JsonResponse) {
            return $client;
        }

        try {
            $order = $orderManager->saveDraft(
                $client,
                $producer,
                (int) ($data['distributionPointId'] ?? 0),
                $this->validateAssistedCollectionDate((string) ($data['collectionDate'] ?? '')),
                is_array($data['lines'] ?? null) ? $data['lines'] : [],
                true,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($serializer->serialize($order, true), Response::HTTP_CREATED);
    }

    /**
     * @param array{productId: int, productName: string, saleUnit: mixed, totalQuantity: string} $row
     *
     * @return array<string, mixed>
     */
    private function serializeHarvestRow(array $row): array
    {
        $raw = $row['saleUnit'] ?? null;
        $saleUnit = $raw instanceof SaleUnit
            ? $raw
            : SaleUnit::tryFrom((string) $raw);

        return [
            'productId' => (int) $row['productId'],
            'productName' => $row['productName'],
            'saleUnit' => $saleUnit?->value,
            'saleUnitLabel' => $saleUnit?->label(),
            'totalQuantity' => (float) $row['totalQuantity'],
        ];
    }

    private function requireProducer(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    private function resolveAssistedClient(
        array $data,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        PasswordPolicy $passwordPolicy,
    ): User|JsonResponse {
        $clientId = (int) ($data['clientId'] ?? 0);
        if ($clientId > 0) {
            $client = $userRepository->find($clientId);
            if (!$client instanceof User || !$client->hasRole(\App\Enum\UserRole::Client)) {
                return $this->json(['error' => 'Client introuvable.'], Response::HTTP_BAD_REQUEST);
            }

            return $client;
        }

        $clientData = $data['client'] ?? null;
        if (!is_array($clientData)) {
            return $this->json(['error' => 'Client requis.'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($clientData['fullName'] ?? ''));
        $email = trim((string) ($clientData['email'] ?? ''));
        $phone = trim((string) ($clientData['phone'] ?? ''));

        if ($fullName === '' || $email === '') {
            return $this->json(['error' => 'Nom et e-mail client requis.'], Response::HTTP_BAD_REQUEST);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'E-mail client invalide.'], Response::HTTP_BAD_REQUEST);
        }
        if (mb_strlen($phone) > 30) {
            return $this->json(['error' => 'Téléphone client trop long.'], Response::HTTP_BAD_REQUEST);
        }

        $existing = $userRepository->findOneBy(['email' => $email]);
        if ($existing instanceof User) {
            if (!$existing->hasRole(\App\Enum\UserRole::Client)) {
                return $this->json(['error' => 'Cet e-mail existe déjà pour un autre type de compte.'], Response::HTTP_BAD_REQUEST);
            }
            if ($existing->getFullName() === null || $existing->getFullName() === '') {
                $existing->setFullName($fullName);
            }
            if ($phone !== '' && ($existing->getPhone() === null || $existing->getPhone() === '')) {
                $existing->setPhone($phone);
            }
            $entityManager->flush();

            return $existing;
        }

        $client = new User();
        $client->setFullName($fullName);
        $client->setEmail($email);
        $client->setPhone($phone !== '' ? $phone : null);
        $client->setRole(\App\Enum\UserRole::Client);
        $client->setIsEmailVerified(true);
        $temporaryPassword = $passwordPolicy->generateTemporary();
        $client->setPassword($passwordHasher->hashPassword($client, $temporaryPassword));

        $entityManager->persist($client);
        $entityManager->flush();

        return $client;
    }

    private function validateAssistedCollectionDate(string $collectionDate): string
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $collectionDate, new \DateTimeZone('Europe/Paris'));
        if ($date === false) {
            throw new \InvalidArgumentException('Date de collecte invalide.');
        }

        $today = new \DateTimeImmutable('today', new \DateTimeZone('Europe/Paris'));
        if ($date < $today) {
            throw new \InvalidArgumentException('La création assistée est autorisée à partir d\'aujourd\'hui.');
        }

        return $collectionDate;
    }

    /**
     * @param array<int, int> $reservedByProduct
     *
     * @return array<string, mixed>
     */
    private function serializeAssistedProduct(Product $product, bool $isNextReservableDate, array $reservedByProduct): array
    {
        $max = $product->getNextSlotMaxQuantity();
        $remaining = null;
        if ($isNextReservableDate && $max !== null) {
            $reserved = $reservedByProduct[$product->getId() ?? 0] ?? 0;
            $remaining = max(0, $max - $reserved);
        }

        return [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'saleUnitLabel' => $product->getSaleUnit()?->label(),
            'priceFormatted' => FrenchDecimal::format($product->getPrice() ?? '0'),
            'photoUrl' => $product->getPhotoPath(),
            'nextSlotMaxQuantity' => $max,
            'nextSlotRemainingQuantity' => $remaining,
            'isSoldOut' => $isNextReservableDate && $remaining !== null && $remaining <= 0,
        ];
    }
}
