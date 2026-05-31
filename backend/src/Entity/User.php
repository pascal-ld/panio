<?php

namespace App\Entity;

use App\Enum\UserRole;
use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[ORM\UniqueConstraint(name: 'UNIQ_PRODUCER_SLUG', fields: ['slug'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private ?string $email = null;

    /**
     * @var list<string>
     */
    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $fullName = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $slug = null;

    #[ORM\Column(options: ['default' => 10])]
    private int $advanceBookingDays = 10;

    #[ORM\Column(options: ['default' => false])]
    private bool $isEmailVerified = false;

    #[ORM\Column(options: ['default' => true])]
    private bool $enabled = true;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $producerPhotoPath = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $producerOrganic = false;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $producerDescription = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $emailVerificationToken = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $emailVerificationExpiresAt = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $passwordSetupToken = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $passwordSetupExpiresAt = null;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: self::class)]
    #[ORM\JoinTable(name: 'client_favorite_producer')]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'producer_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    private Collection $favoriteProducers;

    /**
     * @var Collection<int, DistributionPoint>
     */
    #[ORM\OneToMany(targetEntity: DistributionPoint::class, mappedBy: 'producer', orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $distributionPoints;

    public function __construct()
    {
        $this->favoriteProducers = new ArrayCollection();
        $this->distributionPoints = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        return array_values(array_unique($this->roles));
    }

    public function getRole(): ?UserRole
    {
        foreach ($this->roles as $role) {
            $resolved = UserRole::tryFrom($role);
            if ($resolved !== null) {
                return $resolved;
            }
        }

        return null;
    }

    public function setRole(UserRole $role): static
    {
        $this->roles = [$role->value];

        return $this;
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    public function hasRole(UserRole $role): bool
    {
        return in_array($role->value, $this->getRoles(), true);
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function eraseCredentials(): void
    {
    }

    public function getFullName(): ?string
    {
        return $this->fullName;
    }

    public function setFullName(?string $fullName): static
    {
        $this->fullName = $fullName;

        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): static
    {
        $this->phone = $phone;

        return $this;
    }

    /**
     * @return Collection<int, DistributionPoint>
     */
    public function getDistributionPoints(): Collection
    {
        return $this->distributionPoints;
    }

    public function addDistributionPoint(DistributionPoint $point): static
    {
        if (!$this->distributionPoints->contains($point)) {
            $this->distributionPoints->add($point);
            $point->setProducer($this);
        }

        return $this;
    }

    public function removeDistributionPoint(DistributionPoint $point): static
    {
        if ($this->distributionPoints->removeElement($point) && $point->getProducer() === $this) {
            $point->setProducer(null);
        }

        return $this;
    }

    public function clearDistributionPoints(): static
    {
        foreach ($this->distributionPoints->toArray() as $point) {
            $this->removeDistributionPoint($point);
        }

        return $this;
    }

    public function getSlug(): ?string
    {
        return $this->slug;
    }

    public function setSlug(?string $slug): static
    {
        $this->slug = $slug;

        return $this;
    }

    public function getAdvanceBookingDays(): int
    {
        return $this->advanceBookingDays;
    }

    public function setAdvanceBookingDays(int $advanceBookingDays): static
    {
        $this->advanceBookingDays = max(1, min(60, $advanceBookingDays));

        return $this;
    }

    public function getProducerPhotoPath(): ?string
    {
        return $this->producerPhotoPath;
    }

    public function setProducerPhotoPath(?string $producerPhotoPath): static
    {
        $this->producerPhotoPath = $producerPhotoPath;

        return $this;
    }

    public function isProducerOrganic(): bool
    {
        return $this->producerOrganic;
    }

    public function setProducerOrganic(bool $producerOrganic): static
    {
        $this->producerOrganic = $producerOrganic;

        return $this;
    }

    public function getProducerDescription(): ?string
    {
        return $this->producerDescription;
    }

    public function setProducerDescription(?string $producerDescription): static
    {
        $this->producerDescription = $producerDescription;

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getFavoriteProducers(): Collection
    {
        return $this->favoriteProducers;
    }

    public function addFavoriteProducer(User $producer): static
    {
        if (!$this->favoriteProducers->contains($producer)) {
            $this->favoriteProducers->add($producer);
        }

        return $this;
    }

    public function removeFavoriteProducer(User $producer): static
    {
        $this->favoriteProducers->removeElement($producer);

        return $this;
    }

    public function hasFavoriteProducer(User $producer): bool
    {
        return $this->favoriteProducers->contains($producer);
    }

    public function isProducer(): bool
    {
        return $this->hasRole(UserRole::Producteur) || $this->hasRole(UserRole::SuperAdmin);
    }

    public function isEmailVerified(): bool
    {
        return $this->isEmailVerified;
    }

    public function setIsEmailVerified(bool $isEmailVerified): static
    {
        $this->isEmailVerified = $isEmailVerified;

        return $this;
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): static
    {
        $this->enabled = $enabled;

        return $this;
    }

    public function getEmailVerificationToken(): ?string
    {
        return $this->emailVerificationToken;
    }

    public function setEmailVerificationToken(?string $emailVerificationToken): static
    {
        $this->emailVerificationToken = $emailVerificationToken;

        return $this;
    }

    public function getEmailVerificationExpiresAt(): ?\DateTimeImmutable
    {
        return $this->emailVerificationExpiresAt;
    }

    public function setEmailVerificationExpiresAt(?\DateTimeImmutable $emailVerificationExpiresAt): static
    {
        $this->emailVerificationExpiresAt = $emailVerificationExpiresAt;

        return $this;
    }

    public function markEmailVerified(): static
    {
        $this->isEmailVerified = true;
        $this->emailVerificationToken = null;
        $this->emailVerificationExpiresAt = null;

        return $this;
    }

    public function getPasswordSetupToken(): ?string
    {
        return $this->passwordSetupToken;
    }

    public function setPasswordSetupToken(?string $passwordSetupToken): static
    {
        $this->passwordSetupToken = $passwordSetupToken;

        return $this;
    }

    public function getPasswordSetupExpiresAt(): ?\DateTimeImmutable
    {
        return $this->passwordSetupExpiresAt;
    }

    public function setPasswordSetupExpiresAt(?\DateTimeImmutable $passwordSetupExpiresAt): static
    {
        $this->passwordSetupExpiresAt = $passwordSetupExpiresAt;

        return $this;
    }

    public function isPendingPasswordSetup(): bool
    {
        return $this->passwordSetupToken !== null;
    }

    public function clearPasswordSetupInvitation(): static
    {
        $this->passwordSetupToken = null;
        $this->passwordSetupExpiresAt = null;

        return $this;
    }
}
