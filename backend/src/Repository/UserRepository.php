<?php

namespace App\Repository;

use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    public function findProducerBySlug(string $slug): ?User
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.slug = :slug')
            ->andWhere('u.roles LIKE :role')
            ->setParameter('slug', $slug)
            ->setParameter('role', '%"'.UserRole::Producteur->value.'"%')
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function isSlugTaken(string $slug, ?int $excludeUserId = null): bool
    {
        $qb = $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->andWhere('u.slug = :slug')
            ->setParameter('slug', $slug);

        if ($excludeUserId !== null) {
            $qb->andWhere('u.id != :id')->setParameter('id', $excludeUserId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    /**
     * @return list<User>
     */
    public function findAllProducers(): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.roles LIKE :role')
            ->andWhere('u.slug IS NOT NULL')
            ->setParameter('role', '%"'.UserRole::Producteur->value.'"%')
            ->orderBy('u.fullName', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<User>
     */
    public function findClients(string $query = '', int $limit = 30): array
    {
        $qb = $this->createQueryBuilder('u')
            ->andWhere('u.roles LIKE :role')
            ->setParameter('role', '%"'.UserRole::Client->value.'"%')
            ->orderBy('u.fullName', 'ASC')
            ->setMaxResults($limit);

        $query = trim($query);
        if ($query !== '') {
            $qb
                ->andWhere('LOWER(u.fullName) LIKE :q OR LOWER(u.email) LIKE :q OR LOWER(u.phone) LIKE :q')
                ->setParameter('q', '%'.mb_strtolower($query).'%');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return list<User>
     */
    public function findProducersForAdmin(string $query = ''): array
    {
        $qb = $this->createQueryBuilder('u')
            ->andWhere('u.roles LIKE :role')
            ->setParameter('role', '%"'.UserRole::Producteur->value.'"%')
            ->orderBy('u.fullName', 'ASC')
            ->addOrderBy('u.email', 'ASC');

        $query = trim($query);
        if ($query !== '') {
            $qb
                ->andWhere('LOWER(u.fullName) LIKE :q OR LOWER(u.email) LIKE :q')
                ->setParameter('q', '%'.mb_strtolower($query).'%');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return list<User>
     */
    public function findUsersForAdmin(string $query = '', ?UserRole $role = null): array
    {
        $qb = $this->createQueryBuilder('u')
            ->orderBy('u.fullName', 'ASC')
            ->addOrderBy('u.email', 'ASC');

        if ($role !== null) {
            $qb
                ->andWhere('u.roles LIKE :role')
                ->setParameter('role', '%"'.$role->value.'"%');
        }

        $query = trim($query);
        if ($query !== '') {
            $qb
                ->andWhere('LOWER(u.fullName) LIKE :q OR LOWER(u.email) LIKE :q OR LOWER(u.phone) LIKE :q')
                ->setParameter('q', '%'.mb_strtolower($query).'%');
        }

        return $qb->getQuery()->getResult();
    }

    public function findProducerById(int $id): ?User
    {
        $user = $this->find($id);

        if ($user === null || !$user->hasRole(UserRole::Producteur)) {
            return null;
        }

        return $user;
    }
}
