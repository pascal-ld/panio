<?php

namespace App\Controller\Client;

use App\Entity\CustomerOrder;
use App\Entity\User;
use App\Repository\CustomerOrderRepository;
use App\Repository\UserRepository;
use App\Serializer\OrderSerializer;
use App\Service\OrderManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/client/orders')]
#[IsGranted('ROLE_CLIENT')]
final class OrderController extends AbstractController
{
    #[Route('', name: 'api_client_orders_list', methods: ['GET'])]
    public function list(
        Request $request,
        CustomerOrderRepository $orderRepository,
        UserRepository $userRepository,
        OrderSerializer $serializer,
    ): JsonResponse {
        $client = $this->requireClient();
        $scope = trim((string) $request->query->get('scope', 'all'));
        if (!in_array($scope, ['all', 'active', 'history'], true)) {
            return $this->json(['error' => 'Scope invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $producer = null;
        $slug = trim((string) $request->query->get('producerSlug', ''));
        if ($slug !== '') {
            $producer = $userRepository->findProducerBySlug($slug);
            if ($producer === null) {
                return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
            }
        }

        $orders = $orderRepository->findByClient($client, $scope, $producer);

        return $this->json(array_map(
            fn (CustomerOrder $order) => $serializer->serialize($order),
            $orders,
        ));
    }

    #[Route('/active', name: 'api_client_orders_active', methods: ['GET'])]
    public function active(
        Request $request,
        UserRepository $userRepository,
        CustomerOrderRepository $orderRepository,
        OrderSerializer $serializer,
    ): JsonResponse {
        $client = $this->requireClient();
        $slug = trim((string) $request->query->get('producerSlug', ''));
        $collectionDate = trim((string) $request->query->get('collectionDate', ''));
        $pointId = (int) $request->query->get('distributionPointId', 0);

        if ($slug === '' || $collectionDate === '' || $pointId <= 0) {
            return $this->json(['order' => null]);
        }

        $producer = $userRepository->findProducerBySlug($slug);
        if ($producer === null) {
            return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $collectionDate, new \DateTimeZone('Europe/Paris'));
        if ($date === false) {
            return $this->json(['error' => 'Date invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $order = $orderRepository->findActiveForSlot($client, $producer, $pointId, $date);
        if ($order === null) {
            return $this->json(['order' => null]);
        }

        return $this->json(['order' => $serializer->serialize($order)]);
    }

    #[Route('', name: 'api_client_orders_save', methods: ['PUT'])]
    public function save(Request $request, OrderManager $orderManager, OrderSerializer $serializer, UserRepository $userRepository): JsonResponse
    {
        $client = $this->requireClient();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $slug = trim((string) ($data['producerSlug'] ?? ''));
        $producer = $userRepository->findProducerBySlug($slug);
        if ($producer === null) {
            return $this->json(['error' => 'Producteur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $order = $orderManager->saveDraft(
                $client,
                $producer,
                (int) ($data['distributionPointId'] ?? 0),
                (string) ($data['collectionDate'] ?? ''),
                is_array($data['lines'] ?? null) ? $data['lines'] : [],
                (bool) ($data['reserve'] ?? false),
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($serializer->serialize($order));
    }

    #[Route('/{id}/reserve', name: 'api_client_orders_reserve', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function reserve(int $id, CustomerOrderRepository $orderRepository, OrderManager $orderManager, OrderSerializer $serializer): JsonResponse
    {
        $order = $this->findClientOrder($id, $orderRepository);

        try {
            $order = $orderManager->reserve($this->requireClient(), $order);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($serializer->serialize($order));
    }

    #[Route('/{id}/cancel', name: 'api_client_orders_cancel', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function cancel(int $id, CustomerOrderRepository $orderRepository, OrderManager $orderManager, OrderSerializer $serializer): JsonResponse
    {
        $order = $this->findClientOrder($id, $orderRepository);

        try {
            $order = $orderManager->cancel($this->requireClient(), $order);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($serializer->serialize($order));
    }

    private function requireClient(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    private function findClientOrder(int $id, CustomerOrderRepository $repository): CustomerOrder
    {
        $order = $repository->find($id);
        if ($order === null || $order->getClient()?->getId() !== $this->requireClient()->getId()) {
            throw $this->createNotFoundException();
        }

        return $order;
    }
}
