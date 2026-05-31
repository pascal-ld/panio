<?php

namespace App\Controller\Client;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/client')]
#[IsGranted('ROLE_CLIENT')]
final class PreferenceController extends AbstractController
{
    #[Route('/preferences', name: 'api_client_preferences_get', methods: ['GET'])]
    public function get(): JsonResponse
    {
        $client = $this->requireClient();

        return $this->json([
            'favoriteProducers' => $this->serializeFavoriteProducers($client),
        ]);
    }

    #[Route('/favorite-producer', name: 'api_client_favorite_producer', methods: ['PUT'])]
    public function addFavorite(
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $client = $this->requireClient();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $slug = trim((string) ($data['slug'] ?? ''));
        if ($slug === '') {
            return $this->json(['error' => 'Slug producteur requis.'], Response::HTTP_BAD_REQUEST);
        }

        $producer = $userRepository->findProducerBySlug($slug);
        if ($producer === null) {
            return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $client->addFavoriteProducer($producer);
        $entityManager->flush();

        return $this->json([
            'favoriteProducers' => $this->serializeFavoriteProducers($client),
        ]);
    }

    #[Route('/favorite-producer', name: 'api_client_favorite_producer_delete', methods: ['DELETE'])]
    public function removeFavorite(
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $client = $this->requireClient();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $slug = trim((string) ($data['slug'] ?? ''));
        if ($slug === '') {
            return $this->json(['error' => 'Slug producteur requis.'], Response::HTTP_BAD_REQUEST);
        }

        $producer = $userRepository->findProducerBySlug($slug);
        if ($producer === null) {
            return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $client->removeFavoriteProducer($producer);
        $entityManager->flush();

        return $this->json([
            'favoriteProducers' => $this->serializeFavoriteProducers($client),
        ]);
    }

    #[Route('/producers', name: 'api_client_producers_list', methods: ['GET'])]
    public function listProducers(UserRepository $userRepository): JsonResponse
    {
        $producers = array_map(
            fn (User $producer) => $this->serializeProducerSummary($producer),
            $userRepository->findAllProducers(),
        );

        return $this->json($producers);
    }

    private function requireClient(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function serializeFavoriteProducers(User $client): array
    {
        $producers = $client->getFavoriteProducers()->toArray();
        usort(
            $producers,
            fn (User $a, User $b) => strcasecmp((string) $a->getFullName(), (string) $b->getFullName()),
        );

        return array_map(
            fn (User $producer) => $this->serializeProducerSummary($producer),
            $producers,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProducerSummary(User $producer): array
    {
        return [
            'id' => $producer->getId(),
            'fullName' => $producer->getFullName(),
            'slug' => $producer->getSlug(),
            'shopUrl' => '/producteur/'.$producer->getSlug(),
            'producerOrganic' => $producer->isProducerOrganic(),
        ];
    }
}
