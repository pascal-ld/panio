<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Enum\OrderStatus;
use App\Enum\UserRole;
use App\Repository\CustomerOrderRepository;
use App\Repository\UserRepository;
use App\Service\OrderManager;
use App\Serializer\OrderSerializer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin')]
#[IsGranted('ROLE_SUPER_ADMIN')]
final class OrderController extends AbstractController
{
    #[Route('/clients/{id}/orders', name: 'api_admin_client_orders_list', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function listForClient(
        int $id,
        UserRepository $userRepository,
        CustomerOrderRepository $orderRepository,
        OrderSerializer $serializer,
    ): JsonResponse {
        $client = $userRepository->find($id);
        if ($client === null || !$client->hasRole(UserRole::Client)) {
            return $this->json(['error' => 'Client introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $orders = $orderRepository->findByClient($client);

        return $this->json([
            'client' => $this->serializeClient($client),
            'orders' => array_map(
                static fn ($order) => $serializer->serialize($order, false),
                $orders,
            ),
        ]);
    }

    #[Route('/orders/{id}/status', name: 'api_admin_orders_status', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        CustomerOrderRepository $orderRepository,
        OrderManager $orderManager,
        OrderSerializer $serializer,
    ): JsonResponse {
        $order = $orderRepository->find($id);
        if ($order === null) {
            return $this->json(['error' => 'Commande introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $status = OrderStatus::tryFrom((string) ($data['status'] ?? ''));
        if ($status === null) {
            return $this->json(['error' => 'Statut invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $order = $orderManager->updateAdminStatus($order, $status);

        return $this->json($serializer->serialize($order, true));
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeClient(User $client): array
    {
        return [
            'id' => $client->getId(),
            'fullName' => $client->getFullName(),
            'email' => $client->getEmail(),
            'phone' => $client->getPhone(),
        ];
    }
}
