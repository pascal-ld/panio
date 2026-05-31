<?php

namespace App\Repository;

use App\Entity\Category;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Category>
 */
class CategoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Category::class);
    }

    /**
     * @return list<Category>
     */
    public function findByProducer(User $producer): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.producer = :producer')
            ->setParameter('producer', $producer)
            ->orderBy('c.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneForProducer(int $id, User $producer): ?Category
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.id = :id')
            ->andWhere('c.producer = :producer')
            ->setParameter('id', $id)
            ->setParameter('producer', $producer)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function isSlugTaken(User $producer, string $slug, ?int $excludeCategoryId = null): bool
    {
        $qb = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->andWhere('c.producer = :producer')
            ->andWhere('c.slug = :slug')
            ->setParameter('producer', $producer)
            ->setParameter('slug', $slug);

        if ($excludeCategoryId !== null) {
            $qb->andWhere('c.id != :excludeId')
                ->setParameter('excludeId', $excludeCategoryId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    public function countProducts(Category $category): int
    {
        return (int) $this->getEntityManager()->createQueryBuilder()
            ->select('COUNT(p.id)')
            ->from('App\Entity\Product', 'p')
            ->andWhere('p.category = :category')
            ->setParameter('category', $category)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
