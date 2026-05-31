<?php

namespace App\Entity;

use App\Enum\OrderStatus;
use App\Repository\CustomerOrderRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CustomerOrderRepository::class)]
#[ORM\Table(name: 'customer_order')]
class CustomerOrder
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $client = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $producer = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?DistributionPoint $distributionPoint = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private ?\DateTimeImmutable $collectionDate = null;

    #[ORM\Column(length: 20, enumType: OrderStatus::class)]
    private OrderStatus $status = OrderStatus::Draft;

    #[ORM\Column]
    private ?\DateTimeImmutable $orderDeadlineAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $producerComment = null;

    /**
     * @var Collection<int, OrderLine>
     */
    #[ORM\OneToMany(targetEntity: OrderLine::class, mappedBy: 'customerOrder', cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $lines;

    public function __construct()
    {
        $this->lines = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getClient(): ?User
    {
        return $this->client;
    }

    public function setClient(?User $client): static
    {
        $this->client = $client;

        return $this;
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

    public function getDistributionPoint(): ?DistributionPoint
    {
        return $this->distributionPoint;
    }

    public function setDistributionPoint(?DistributionPoint $distributionPoint): static
    {
        $this->distributionPoint = $distributionPoint;

        return $this;
    }

    public function getCollectionDate(): ?\DateTimeImmutable
    {
        return $this->collectionDate;
    }

    public function setCollectionDate(\DateTimeImmutable $collectionDate): static
    {
        $this->collectionDate = $collectionDate;

        return $this;
    }

    public function getStatus(): OrderStatus
    {
        return $this->status;
    }

    public function setStatus(OrderStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getOrderDeadlineAt(): ?\DateTimeImmutable
    {
        return $this->orderDeadlineAt;
    }

    public function setOrderDeadlineAt(\DateTimeImmutable $orderDeadlineAt): static
    {
        $this->orderDeadlineAt = $orderDeadlineAt;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function touch(): static
    {
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }

    public function getProducerComment(): ?string
    {
        return $this->producerComment;
    }

    public function setProducerComment(?string $producerComment): static
    {
        $this->producerComment = $producerComment;

        return $this;
    }

    /**
     * @return Collection<int, OrderLine>
     */
    public function getLines(): Collection
    {
        return $this->lines;
    }

    public function addLine(OrderLine $line): static
    {
        if (!$this->lines->contains($line)) {
            $this->lines->add($line);
            $line->setCustomerOrder($this);
        }

        return $this;
    }

    public function removeLine(OrderLine $line): static
    {
        if ($this->lines->removeElement($line) && $line->getCustomerOrder() === $this) {
            $line->setCustomerOrder(null);
        }

        return $this;
    }

    public function clearLines(): static
    {
        foreach ($this->lines->toArray() as $line) {
            $this->removeLine($line);
        }

        return $this;
    }
}
