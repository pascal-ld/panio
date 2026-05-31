<?php

namespace App\Controller\Producteur;

use App\Entity\Category;
use App\Entity\User;
use App\Repository\CategoryRepository;
use App\Service\CategorySlugGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/producteur/categories')]
#[IsGranted('ROLE_PRODUCTEUR')]
final class CategoryController extends AbstractController
{
    #[Route('', name: 'api_producteur_categories_list', methods: ['GET'])]
    public function list(CategoryRepository $categoryRepository): JsonResponse
    {
        $user = $this->requireProducer();

        $categories = array_map(
            fn (Category $category) => $this->serializeCategory($category, $categoryRepository),
            $categoryRepository->findByProducer($user),
        );

        return $this->json($categories);
    }

    #[Route('', name: 'api_producteur_categories_create', methods: ['POST'])]
    public function create(
        Request $request,
        CategorySlugGenerator $slugGenerator,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->requireProducer();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        if (mb_strlen($name) > 100) {
            return $this->json(['error' => 'Le nom est trop long.'], Response::HTTP_BAD_REQUEST);
        }

        $category = new Category();
        $category->setName($name);
        $category->setSlug($slugGenerator->generateFromName($name, $user));
        $category->setProducer($user);

        $entityManager->persist($category);
        $entityManager->flush();

        return $this->json(
            $this->serializeCategory($category, $entityManager->getRepository(Category::class)),
            Response::HTTP_CREATED,
        );
    }

    #[Route('/{id}', name: 'api_producteur_categories_update', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function update(
        int $id,
        Request $request,
        CategoryRepository $categoryRepository,
        CategorySlugGenerator $slugGenerator,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->requireProducer();

        $category = $categoryRepository->findOneForProducer($id, $user);
        if ($category === null) {
            return $this->json(['error' => 'Catégorie introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        if (mb_strlen($name) > 100) {
            return $this->json(['error' => 'Le nom est trop long.'], Response::HTTP_BAD_REQUEST);
        }

        $category->setName($name);
        $category->setSlug($slugGenerator->generateFromName($name, $user, $category->getId()));
        $entityManager->flush();

        return $this->json($this->serializeCategory($category, $categoryRepository));
    }

    #[Route('/{id}', name: 'api_producteur_categories_delete', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(
        int $id,
        CategoryRepository $categoryRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->requireProducer();

        $category = $categoryRepository->findOneForProducer($id, $user);
        if ($category === null) {
            return $this->json(['error' => 'Catégorie introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($category);
        $entityManager->flush();

        return new JsonResponse(status: Response::HTTP_NO_CONTENT);
    }

    private function requireProducer(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCategory(Category $category, CategoryRepository $categoryRepository): array
    {
        return [
            'id' => $category->getId(),
            'name' => $category->getName(),
            'slug' => $category->getSlug(),
            'productCount' => $categoryRepository->countProducts($category),
        ];
    }
}
