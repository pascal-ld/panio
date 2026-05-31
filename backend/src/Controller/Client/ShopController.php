<?php

namespace App\Controller\Client;

use App\Entity\Product;
use App\Entity\User;
use App\Enum\SaleUnit;
use App\Repository\CustomerOrderRepository;
use App\Repository\ProductRepository;
use App\Repository\UserRepository;
use App\Serializer\OrderSerializer;
use App\Service\CollectionDateResolver;
use App\Util\FrenchDecimal;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/client/shop')]
#[IsGranted('ROLE_CLIENT')]
final class ShopController extends AbstractController
{
    #[Route('/{slug}', name: 'api_client_shop_show', methods: ['GET'])]
    public function show(
        string $slug,
        UserRepository $userRepository,
        ProductRepository $productRepository,
        CustomerOrderRepository $orderRepository,
        CollectionDateResolver $collectionDateResolver,
        OrderSerializer $orderSerializer,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        $producer = $userRepository->findProducerBySlug($slug);
        if ($producer === null) {
            return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $collectionSlots = $collectionDateResolver->getAvailableSlots($producer);
        $nextReservableDate = $this->resolveNextReservableDate($collectionSlots);
        $reservedByProduct = $nextReservableDate !== null
            ? $orderRepository->aggregateReservedQuantitiesForDate($producer, $nextReservableDate)
            : [];

        $products = array_map(
            fn (Product $product) => $this->serializeProduct($product, $nextReservableDate, $reservedByProduct),
            $productRepository->findAvailableByProducer($producer),
        );

        $myOrders = array_map(
            fn ($order) => $orderSerializer->serialize($order),
            $orderRepository->findByClient($user, 'active', $producer),
        );

        return $this->json([
            'producer' => [
                'id' => $producer->getId(),
                'fullName' => $producer->getFullName(),
                'slug' => $producer->getSlug(),
                'advanceBookingDays' => $producer->getAdvanceBookingDays(),
                'producerPhotoPath' => $producer->getProducerPhotoPath(),
                'producerOrganic' => $producer->isProducerOrganic(),
                'producerDescription' => $producer->getProducerDescription(),
            ],
            'products' => $products,
            'collectionSlots' => $collectionSlots,
            'nextReservableDate' => $nextReservableDate?->format('Y-m-d'),
            'myOrders' => $myOrders,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProduct(
        Product $product,
        ?\DateTimeImmutable $nextReservableDate,
        array $reservedByProduct,
    ): array
    {
        $category = $product->getCategory();
        $saleUnit = $product->getSaleUnit();
        $remaining = $this->computeNextSlotRemaining($product, $nextReservableDate, $reservedByProduct);

        return [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'description' => $product->getDescription(),
            'unit' => $product->getUnit(),
            'saleUnit' => $saleUnit?->value,
            'saleUnitLabel' => $saleUnit?->label(),
            'price' => $product->getPrice(),
            'priceFormatted' => FrenchDecimal::format($product->getPrice()),
            'photoUrl' => $product->getPhotoPath(),
            'category' => $category ? [
                'id' => $category->getId(),
                'name' => $category->getName(),
            ] : null,
            'nextSlotMaxQuantity' => $product->getNextSlotMaxQuantity(),
            'nextSlotRemainingQuantity' => $remaining,
        ];
    }

    /**
     * @param list<array<string, mixed>> $collectionSlots
     */
    private function resolveNextReservableDate(array $collectionSlots): ?\DateTimeImmutable
    {
        if ($collectionSlots === []) {
            return null;
        }

        $firstDate = (string) ($collectionSlots[0]['date'] ?? '');
        $resolved = \DateTimeImmutable::createFromFormat('!Y-m-d', $firstDate, new \DateTimeZone('Europe/Paris'));

        return $resolved ?: null;
    }

    /**
     * @param array<int, int> $reservedByProduct
     */
    private function computeNextSlotRemaining(
        Product $product,
        ?\DateTimeImmutable $nextReservableDate,
        array $reservedByProduct,
    ): ?int {
        if ($nextReservableDate === null) {
            return null;
        }

        $max = $product->getNextSlotMaxQuantity();
        if ($max === null) {
            return null;
        }

        $reserved = $reservedByProduct[$product->getId() ?? 0] ?? 0;

        return max(0, $max - $reserved);
    }

}
