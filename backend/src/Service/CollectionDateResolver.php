<?php

namespace App\Service;

use App\Entity\DistributionPoint;
use App\Entity\User;
use App\Enum\Weekday;
use App\Repository\CustomerOrderRepository;

final class CollectionDateResolver
{
    public function __construct(
        private readonly OrderDeadlineCalculator $orderDeadlineCalculator,
        private readonly CustomerOrderRepository $orderRepository,
    ) {
    }
    /**
     * @return list<array<string, mixed>>
     */
    public function getAvailableSlots(User $producer, ?\DateTimeImmutable $now = null): array
    {
        $now ??= new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris'));
        $advanceDays = $producer->getAdvanceBookingDays();
        $end = $now->modify(sprintf('+%d days', $advanceDays))->setTime(23, 59, 59);

        $slots = [];
        $cursor = $now->setTime(0, 0, 0);
        $reservedBySlot = $this->orderRepository->countBySlotsInDateRange(
            $producer,
            $cursor,
            $end->setTime(0, 0, 0),
        );

        while ($cursor <= $end) {
            $isoWeekday = (int) $cursor->format('N');

            foreach ($producer->getDistributionPoints() as $point) {
                if ($point->getDistributionDay()?->toIsoWeekday() !== $isoWeekday) {
                    continue;
                }

                $deadline = $this->orderDeadlineCalculator->compute($cursor, $point);
                if ($now > $deadline) {
                    continue;
                }
                $slotKey = $cursor->format('Y-m-d').'-'.$point->getId();
                $maxBaskets = $point->getMaxBaskets();
                $usedBaskets = $reservedBySlot[$slotKey] ?? 0;
                if ($maxBaskets !== null && $usedBaskets >= $maxBaskets) {
                    continue;
                }

                $slots[] = [
                    'date' => $cursor->format('Y-m-d'),
                    'dateLabel' => $this->formatFrenchDate($cursor),
                    'distributionPointId' => $point->getId(),
                    'locationLabel' => $point->getLocationLabel(),
                    'distributionDay' => $point->getDistributionDay()?->value,
                    'distributionDayLabel' => $point->getDistributionDay()?->label(),
                    'distributionStartTime' => $point->getDistributionStartTime()?->format('H:i'),
                    'distributionEndTime' => $point->getDistributionEndTime()?->format('H:i'),
                    'maxBaskets' => $maxBaskets,
                    'orderDeadlineAt' => $deadline->format(\DateTimeInterface::ATOM),
                    'orderDeadlineLabel' => sprintf(
                        '%s à %s',
                        $point->getOrderDeadlineDay()?->label(),
                        $point->getOrderDeadlineTime()?->format('H:i'),
                    ),
                ];
            }

            $cursor = $cursor->modify('+1 day');
        }

        usort($slots, static fn (array $a, array $b) => [$a['date'], $a['locationLabel']] <=> [$b['date'], $b['locationLabel']]);

        return $slots;
    }

    private function formatFrenchDate(\DateTimeImmutable $date): string
    {
        $days = array_map(static fn (Weekday $d) => $d->label(), Weekday::cases());
        $dayLabel = $days[(int) $date->format('N') - 1] ?? $date->format('l');

        return sprintf('%s %s %s', $dayLabel, $date->format('j'), $this->frenchMonth((int) $date->format('n')));
    }

    private function frenchMonth(int $month): string
    {
        return match ($month) {
            1 => 'janvier',
            2 => 'février',
            3 => 'mars',
            4 => 'avril',
            5 => 'mai',
            6 => 'juin',
            7 => 'juillet',
            8 => 'août',
            9 => 'septembre',
            10 => 'octobre',
            11 => 'novembre',
            12 => 'décembre',
            default => '',
        };
    }
}
