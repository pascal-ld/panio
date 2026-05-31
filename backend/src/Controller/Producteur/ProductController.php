<?php

namespace App\Controller\Producteur;

use App\Entity\Category;
use App\Entity\Product;
use App\Entity\User;
use App\Enum\SaleUnit;
use App\Repository\CategoryRepository;
use App\Repository\ProductRepository;
use App\Service\ProductPhotoUploader;
use App\Util\FrenchDecimal;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/producteur/products')]
#[IsGranted('ROLE_PRODUCTEUR')]
final class ProductController extends AbstractController
{
    #[Route('', name: 'api_producteur_products_list', methods: ['GET'])]
    public function list(ProductRepository $productRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $products = array_map(
            fn (Product $product) => $this->serializeProduct($product),
            $productRepository->findByProducer($user),
        );

        return $this->json($products);
    }

    #[Route('/sale-units', name: 'api_producteur_sale_units', methods: ['GET'])]
    public function saleUnits(): JsonResponse
    {
        $units = array_map(
            static fn (SaleUnit $unit) => [
                'value' => $unit->value,
                'label' => $unit->label(),
            ],
            SaleUnit::cases(),
        );

        return $this->json($units);
    }

    #[Route('', name: 'api_producteur_products_create', methods: ['POST'])]
    public function create(
        Request $request,
        CategoryRepository $categoryRepository,
        EntityManagerInterface $entityManager,
        ProductPhotoUploader $photoUploader,
        ValidatorInterface $validator,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $this->parseProductPayload($request);
        $error = $this->validateProductPayload($payload, $validator);
        if ($error !== null) {
            return $this->json(['error' => $error], Response::HTTP_BAD_REQUEST);
        }

        $categoryError = $this->resolveCategory($user, $payload['categoryId'], $categoryRepository);
        if ($categoryError !== null) {
            return $this->json(['error' => $categoryError], Response::HTTP_BAD_REQUEST);
        }
        $category = $this->findCategoryForProducer($user, $payload['categoryId'], $categoryRepository);

        $saleUnit = SaleUnit::tryFrom($payload['saleUnit']);
        if ($saleUnit === null) {
            return $this->json(['error' => 'Unité de vente invalide'], Response::HTTP_BAD_REQUEST);
        }

        $product = new Product();
        $product->setName($payload['name']);
        $product->setCategory($category);
        $product->setUnit($payload['unit']);
        $product->setSaleUnit($saleUnit);
        $product->setPrice(number_format((float) $payload['price'], 2, '.', ''));
        $product->setDescription($payload['description'] !== '' ? $payload['description'] : null);
        $product->setNextSlotMaxQuantity($payload['nextSlotMaxQuantity']);
        $product->setProducer($user);

        $photoError = $this->applyPhotoIfPresent($request, $product, $photoUploader);
        if ($photoError !== null) {
            return $this->json(['error' => $photoError], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->persist($product);
        $entityManager->flush();

        return $this->json($this->serializeProduct($product), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_producteur_products_show', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(int $id, ProductRepository $productRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $product = $productRepository->findOneForProducer($id, $user);
        if ($product === null) {
            return $this->json(['error' => 'Produit introuvable.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeProduct($product));
    }

    #[Route('/{id}', name: 'api_producteur_products_update', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function update(
        int $id,
        Request $request,
        ProductRepository $productRepository,
        CategoryRepository $categoryRepository,
        EntityManagerInterface $entityManager,
        ProductPhotoUploader $photoUploader,
        ValidatorInterface $validator,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $product = $productRepository->findOneForProducer($id, $user);
        if ($product === null) {
            return $this->json(['error' => 'Produit introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->parseProductPayload($request);
        $error = $this->validateProductPayload($payload, $validator);
        if ($error !== null) {
            return $this->json(['error' => $error], Response::HTTP_BAD_REQUEST);
        }

        $categoryError = $this->resolveCategory($user, $payload['categoryId'], $categoryRepository);
        if ($categoryError !== null) {
            return $this->json(['error' => $categoryError], Response::HTTP_BAD_REQUEST);
        }
        $category = $this->findCategoryForProducer($user, $payload['categoryId'], $categoryRepository);

        $saleUnit = SaleUnit::tryFrom($payload['saleUnit']);
        if ($saleUnit === null) {
            return $this->json(['error' => 'Unité de vente invalide'], Response::HTTP_BAD_REQUEST);
        }

        $product->setName($payload['name']);
        $product->setCategory($category);
        $product->setUnit($payload['unit']);
        $product->setSaleUnit($saleUnit);
        $product->setPrice(number_format((float) $payload['price'], 2, '.', ''));
        $product->setDescription($payload['description'] !== '' ? $payload['description'] : null);
        $product->setNextSlotMaxQuantity($payload['nextSlotMaxQuantity']);

        $photoError = $this->applyPhotoIfPresent($request, $product, $photoUploader);
        if ($photoError !== null) {
            return $this->json(['error' => $photoError], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->flush();

        return $this->json($this->serializeProduct($product));
    }

    #[Route('/{id}/availability', name: 'api_producteur_products_availability', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function updateAvailability(
        int $id,
        Request $request,
        ProductRepository $productRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $product = $productRepository->findOneForProducer($id, $user);
        if ($product === null) {
            return $this->json(['error' => 'Produit introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        if (!array_key_exists('isAvailable', $data) || !is_bool($data['isAvailable'])) {
            return $this->json(['error' => 'Le champ isAvailable (booléen) est requis.'], Response::HTTP_BAD_REQUEST);
        }

        $product->setIsAvailable($data['isAvailable']);
        $entityManager->flush();

        return $this->json($this->serializeProduct($product));
    }

    /**
     * @return array<string, mixed>
     */
    private function parseProductPayload(Request $request): array
    {
        $categoryId = $request->request->get('categoryId');
        if ($categoryId === null || $categoryId === '') {
            $categoryId = null;
        }

        return [
            'name' => trim((string) $request->request->get('name', '')),
            'categoryId' => $categoryId,
            'unit' => trim((string) $request->request->get('unit', '')),
            'saleUnit' => (string) $request->request->get('saleUnit', ''),
            'price' => FrenchDecimal::normalize(trim((string) $request->request->get('price', ''))),
            'description' => trim((string) $request->request->get('description', '')),
            'nextSlotMaxQuantity' => $this->parseNextSlotMaxQuantity($request->request->get('nextSlotMaxQuantity')),
        ];
    }

    private function validateProductPayload(array $payload, ValidatorInterface $validator): ?string
    {
        $constraints = new Assert\Collection([
            'name' => [new Assert\NotBlank(), new Assert\Length(max: 180)],
            'categoryId' => [new Assert\Optional([new Assert\Type('numeric')])],
            'unit' => [new Assert\NotBlank(), new Assert\Length(max: 50)],
            'saleUnit' => [new Assert\NotBlank(), new Assert\Choice(choices: SaleUnit::values())],
            'price' => [new Assert\NotBlank(), new Assert\Positive()],
            'description' => [new Assert\Length(max: 2000)],
            'nextSlotMaxQuantity' => [new Assert\Optional([new Assert\Type('integer'), new Assert\Positive()])],
        ]);

        $violations = $validator->validate($payload, $constraints);
        if (count($violations) > 0) {
            return (string) $violations->get(0)->getMessage();
        }

        return null;
    }

    private function parseNextSlotMaxQuantity(mixed $raw): ?int
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        if (is_int($raw)) {
            return $raw;
        }

        if (is_string($raw) && ctype_digit($raw)) {
            return (int) $raw;
        }

        return -1;
    }

    private function resolveCategory(User $producer, mixed $categoryId, CategoryRepository $categoryRepository): ?string
    {
        if ($categoryId === null || $categoryId === '') {
            return null;
        }

        if (!is_numeric($categoryId)) {
            return 'Catégorie invalide.';
        }

        $category = $categoryRepository->findOneForProducer((int) $categoryId, $producer);
        if ($category === null) {
            return 'Catégorie introuvable.';
        }

        return null;
    }

    private function findCategoryForProducer(
        User $producer,
        mixed $categoryId,
        CategoryRepository $categoryRepository,
    ): ?Category {
        if ($categoryId === null || $categoryId === '') {
            return null;
        }

        return $categoryRepository->findOneForProducer((int) $categoryId, $producer);
    }

    private function applyPhotoIfPresent(
        Request $request,
        Product $product,
        ProductPhotoUploader $photoUploader,
    ): ?string {
        $photo = $request->files->get('photo');
        if (!$photo instanceof UploadedFile) {
            return null;
        }

        if ($photo->getSize() === 0 || $photo->getClientOriginalName() === '') {
            return null;
        }

        try {
            $product->setPhotoPath($photoUploader->upload($photo));
        } catch (\InvalidArgumentException $exception) {
            return $exception->getMessage();
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProduct(Product $product): array
    {
        $category = $product->getCategory();
        $saleUnit = $product->getSaleUnit();

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
            'isAvailable' => $product->isAvailable(),
            'nextSlotMaxQuantity' => $product->getNextSlotMaxQuantity(),
            'createdAt' => $product->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
