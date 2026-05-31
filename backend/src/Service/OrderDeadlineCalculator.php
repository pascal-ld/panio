<?php

namespace App\Service;

use App\Entity\DistributionPoint;

final class OrderDeadlineCalculator
{
    public function compute(
        \DateTimeImmutable $distributionDate,
        DistributionPoint $point,
    ): \DateTimeImmutable {
        $distributionWeekday = (int) $distributionDate->format('N');
        $deadlineWeekday = $point->getOrderDeadlineDay()?->toIsoWeekday() ?? $distributionWeekday;

        $daysBack = ($distributionWeekday - $deadlineWeekday + 7) % 7;
        $deadlineDate = $distributionDate->modify(sprintf('-%d days', $daysBack));
        $time = $point->getOrderDeadlineTime() ?? new \DateTimeImmutable('12:00');

        return $deadlineDate->setTime(
            (int) $time->format('H'),
            (int) $time->format('i'),
            0,
        );
    }
}
