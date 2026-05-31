<?php

namespace App\Controller\Producteur;

use App\Entity\DistributionPoint;
use App\Entity\User;
use App\Enum\Weekday;
use App\Repository\DistributionPointRepository;
use App\Repository\UserRepository;
use App\Service\ProducerPhotoUploader;
use App\Service\ProducerSlugGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/producteur/settings')]
#[IsGranted('ROLE_PRODUCTEUR')]
final class SettingsController extends AbstractController
{
    #[Route('', name: 'api_producteur_settings_get', methods: ['GET'])]
    public function get(): JsonResponse
    {
        return $this->json($this->serializeSettings($this->requireProducer()));
    }

    #[Route('/profile', name: 'api_producteur_settings_profile', methods: ['PUT', 'POST'])]
    public function updateProfile(
        Request $request,
        EntityManagerInterface $entityManager,
        UserRepository $userRepository,
        ProducerSlugGenerator $slugGenerator,
        ProducerPhotoUploader $photoUploader,
    ): JsonResponse {
        $user = $this->requireProducer();

        try {
            $data = $this->parseProfileRequest($request);
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($data['fullName'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));

        if ($fullName === '') {
            return $this->json(['error' => 'Le nom est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'E-mail invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $existing = $userRepository->findOneBy(['email' => $email]);
        if ($existing !== null && $existing->getId() !== $user->getId()) {
            return $this->json(['error' => 'Cet e-mail est déjà utilisé.'], Response::HTTP_BAD_REQUEST);
        }

        $slugInput = trim((string) ($data['slug'] ?? ''));
        $advanceBookingDays = (int) ($data['advanceBookingDays'] ?? $user->getAdvanceBookingDays());
        $description = trim((string) ($data['producerDescription'] ?? ''));
        $organic = filter_var($data['producerOrganic'] ?? $user->isProducerOrganic(), FILTER_VALIDATE_BOOLEAN);
        $removePhoto = filter_var($data['removePhoto'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($advanceBookingDays < 1 || $advanceBookingDays > 60) {
            return $this->json(['error' => 'La réservation à l\'avance doit être entre 1 et 60 jours.'], Response::HTTP_BAD_REQUEST);
        }
        if (mb_strlen($description) > 500) {
            return $this->json(['error' => 'La description doit faire 500 caractères maximum.'], Response::HTTP_BAD_REQUEST);
        }

        if ($slugInput === '') {
            if ($user->getSlug() === null) {
                $user->setSlug($slugGenerator->generateFromName($fullName, $user->getId()));
            }
        } else {
            $slug = $slugGenerator->normalize($slugInput);
            if ($userRepository->isSlugTaken($slug, $user->getId())) {
                return $this->json(['error' => 'Ce lien boutique est déjà utilisé.'], Response::HTTP_BAD_REQUEST);
            }
            $user->setSlug($slug);
        }

        $photoError = $this->applyProducerPhoto($request, $user, $photoUploader, $removePhoto);
        if ($photoError !== null) {
            return $this->json(['error' => $photoError], Response::HTTP_BAD_REQUEST);
        }

        $user->setFullName($fullName);
        $user->setPhone($phone !== '' ? $phone : null);
        $user->setEmail($email);
        $user->setAdvanceBookingDays($advanceBookingDays);
        $user->setProducerOrganic($organic);
        $user->setProducerDescription($description !== '' ? $description : null);
        $entityManager->flush();

        return $this->json($this->serializeSettings($user));
    }

    #[Route('/distribution-points', name: 'api_producteur_distribution_point_create', methods: ['POST'])]
    public function createDistributionPoint(
        Request $request,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->requireProducer();

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($data)) {
            return $this->json(['error' => 'Données invalides.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $point = $this->createDistributionPointFromArray($data);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $user->addDistributionPoint($point);
        $entityManager->flush();

        return $this->json($this->serializeDistributionPoint($point), Response::HTTP_CREATED);
    }

    #[Route('/distribution-points/{id}', name: 'api_producteur_distribution_point_update', methods: ['PUT'])]
    public function updateDistributionPoint(
        int $id,
        Request $request,
        DistributionPointRepository $pointRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->requireProducer();
        $point = $pointRepository->findOneBy(['id' => $id, 'producer' => $user]);

        if ($point === null) {
            return $this->json(['error' => 'Lieu introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $updated = $this->createDistributionPointFromArray($data);
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $point->setLocationLabel($updated->getLocationLabel());
        $point->setDistributionDay($updated->getDistributionDay());
        $point->setDistributionStartTime($updated->getDistributionStartTime());
        $point->setDistributionEndTime($updated->getDistributionEndTime());
        $point->setOrderDeadlineDay($updated->getOrderDeadlineDay());
        $point->setOrderDeadlineTime($updated->getOrderDeadlineTime());

        $entityManager->flush();

        return $this->json($this->serializeDistributionPoint($point));
    }

    #[Route('/distribution-points/{id}', name: 'api_producteur_distribution_point_delete', methods: ['DELETE'])]
    public function deleteDistributionPoint(
        int $id,
        DistributionPointRepository $pointRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->requireProducer();
        $point = $pointRepository->findOneBy(['id' => $id, 'producer' => $user]);

        if ($point === null) {
            return $this->json(['error' => 'Lieu introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($point);
        $entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/weekdays', name: 'api_producteur_weekdays', methods: ['GET'])]
    public function weekdays(): JsonResponse
    {
        $days = array_map(
            static fn (Weekday $day) => ['value' => $day->value, 'label' => $day->label()],
            Weekday::cases(),
        );

        return $this->json($days);
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
    private function parseProfileRequest(Request $request): array
    {
        if (str_starts_with((string) $request->headers->get('Content-Type'), 'multipart/')) {
            return [
                'fullName' => $request->request->get('fullName'),
                'phone' => $request->request->get('phone'),
                'email' => $request->request->get('email'),
                'slug' => $request->request->get('slug'),
                'advanceBookingDays' => $request->request->get('advanceBookingDays'),
                'producerDescription' => $request->request->get('producerDescription'),
                'producerOrganic' => $request->request->get('producerOrganic'),
                'removePhoto' => $request->request->get('removePhoto'),
            ];
        }

        return $request->toArray();
    }

    private function applyProducerPhoto(
        Request $request,
        User $user,
        ProducerPhotoUploader $photoUploader,
        bool $removePhoto,
    ): ?string {
        if ($removePhoto) {
            $user->setProducerPhotoPath(null);

            return null;
        }

        $photo = $request->files->get('photo');
        if (!$photo instanceof UploadedFile) {
            return null;
        }

        if ($photo->getSize() === 0 || $photo->getClientOriginalName() === '') {
            return null;
        }

        try {
            $user->setProducerPhotoPath($photoUploader->upload($photo));
        } catch (\InvalidArgumentException $exception) {
            return $exception->getMessage();
        }

        return null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function createDistributionPointFromArray(array $data): DistributionPoint
    {
        $locationLabel = trim((string) ($data['locationLabel'] ?? ''));
        if ($locationLabel === '') {
            throw new \InvalidArgumentException('Le nom du lieu de distribution est obligatoire.');
        }

        $distributionDay = Weekday::tryFrom((string) ($data['distributionDay'] ?? ''));
        $orderDeadlineDay = Weekday::tryFrom((string) ($data['orderDeadlineDay'] ?? ''));
        if ($distributionDay === null || $orderDeadlineDay === null) {
            throw new \InvalidArgumentException('Jour de la semaine invalide.');
        }

        $startTime = $this->parseTime((string) ($data['distributionStartTime'] ?? ''));
        $endTime = $this->parseTime((string) ($data['distributionEndTime'] ?? ''));
        $deadlineTime = $this->parseTime((string) ($data['orderDeadlineTime'] ?? ''));
        $maxBasketsRaw = $data['maxBaskets'] ?? null;
        $maxBaskets = null;
        if ($maxBasketsRaw !== null && trim((string) $maxBasketsRaw) !== '') {
            $maxBaskets = (int) $maxBasketsRaw;
            if ($maxBaskets < 1 || $maxBaskets > 500) {
                throw new \InvalidArgumentException('La limite de paniers doit être entre 1 et 500.');
            }
        }

        if ($startTime >= $endTime) {
            throw new \InvalidArgumentException(
                sprintf('Lieu « %s » : l\'heure de fin doit être après l\'heure de début.', $locationLabel),
            );
        }

        $point = new DistributionPoint();
        $point->setLocationLabel($locationLabel);
        $point->setDistributionDay($distributionDay);
        $point->setDistributionStartTime($startTime);
        $point->setDistributionEndTime($endTime);
        $point->setOrderDeadlineDay($orderDeadlineDay);
        $point->setOrderDeadlineTime($deadlineTime);
        $point->setMaxBaskets($maxBaskets);

        return $point;
    }

    private function parseTime(string $value): \DateTimeInterface
    {
        $value = trim($value);
        $parsed = \DateTime::createFromFormat('H:i', $value) ?: \DateTime::createFromFormat('H:i:s', $value);
        if ($parsed === false) {
            throw new \InvalidArgumentException(sprintf('Heure invalide : %s', $value));
        }

        return $parsed;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeDistributionPoint(DistributionPoint $point): array
    {
        return [
            'id' => $point->getId(),
            'locationLabel' => $point->getLocationLabel(),
            'distributionDay' => $point->getDistributionDay()?->value,
            'distributionDayLabel' => $point->getDistributionDay()?->label(),
            'distributionStartTime' => $point->getDistributionStartTime()?->format('H:i'),
            'distributionEndTime' => $point->getDistributionEndTime()?->format('H:i'),
            'orderDeadlineDay' => $point->getOrderDeadlineDay()?->value,
            'orderDeadlineDayLabel' => $point->getOrderDeadlineDay()?->label(),
            'orderDeadlineTime' => $point->getOrderDeadlineTime()?->format('H:i'),
            'maxBaskets' => $point->getMaxBaskets(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSettings(User $user): array
    {
        $points = [];
        foreach ($user->getDistributionPoints() as $point) {
            $points[] = $this->serializeDistributionPoint($point);
        }

        return [
            'fullName' => $user->getFullName(),
            'phone' => $user->getPhone(),
            'email' => $user->getEmail(),
            'slug' => $user->getSlug(),
            'advanceBookingDays' => $user->getAdvanceBookingDays(),
            'producerPhotoPath' => $user->getProducerPhotoPath(),
            'producerOrganic' => $user->isProducerOrganic(),
            'producerDescription' => $user->getProducerDescription(),
            'shopUrl' => $user->getSlug() !== null ? '/producteur/'.$user->getSlug() : null,
            'distributionPoints' => $points,
        ];
    }
}
