<?php

namespace App\Entity;

use App\Enum\Weekday;
use App\Repository\DistributionPointRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DistributionPointRepository::class)]
class DistributionPoint
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'distributionPoints')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $producer = null;

    #[ORM\Column(length: 180)]
    private ?string $locationLabel = null;

    #[ORM\Column(length: 10, enumType: Weekday::class)]
    private ?Weekday $distributionDay = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    private ?\DateTimeInterface $distributionStartTime = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    private ?\DateTimeInterface $distributionEndTime = null;

    #[ORM\Column(length: 10, enumType: Weekday::class)]
    private ?Weekday $orderDeadlineDay = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    private ?\DateTimeInterface $orderDeadlineTime = null;

    #[ORM\Column(nullable: true)]
    private ?int $maxBaskets = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProducer(): ?User
    {
        return $this->producer;
    }

    public function setProducer(?User $producer): static
    {
        $this->producer = $producer;

        return $this;
    }

    public function getLocationLabel(): ?string
    {
        return $this->locationLabel;
    }

    public function setLocationLabel(string $locationLabel): static
    {
        $this->locationLabel = $locationLabel;

        return $this;
    }

    public function getDistributionDay(): ?Weekday
    {
        return $this->distributionDay;
    }

    public function setDistributionDay(Weekday $distributionDay): static
    {
        $this->distributionDay = $distributionDay;

        return $this;
    }

    public function getDistributionStartTime(): ?\DateTimeInterface
    {
        return $this->distributionStartTime;
    }

    public function setDistributionStartTime(\DateTimeInterface $distributionStartTime): static
    {
        $this->distributionStartTime = $distributionStartTime;

        return $this;
    }

    public function getDistributionEndTime(): ?\DateTimeInterface
    {
        return $this->distributionEndTime;
    }

    public function setDistributionEndTime(\DateTimeInterface $distributionEndTime): static
    {
        $this->distributionEndTime = $distributionEndTime;

        return $this;
    }

    public function getOrderDeadlineDay(): ?Weekday
    {
        return $this->orderDeadlineDay;
    }

    public function setOrderDeadlineDay(Weekday $orderDeadlineDay): static
    {
        $this->orderDeadlineDay = $orderDeadlineDay;

        return $this;
    }

    public function getOrderDeadlineTime(): ?\DateTimeInterface
    {
        return $this->orderDeadlineTime;
    }

    public function setOrderDeadlineTime(\DateTimeInterface $orderDeadlineTime): static
    {
        $this->orderDeadlineTime = $orderDeadlineTime;

        return $this;
    }

    public function getMaxBaskets(): ?int
    {
        return $this->maxBaskets;
    }

    public function setMaxBaskets(?int $maxBaskets): static
    {
        $this->maxBaskets = $maxBaskets !== null && $maxBaskets > 0 ? $maxBaskets : null;

        return $this;
    }
}
