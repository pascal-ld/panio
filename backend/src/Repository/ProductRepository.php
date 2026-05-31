<?php

namespace App\Repository;

use App\Entity\Product;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Product>
 */
class ProductRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Product::class);
    }

    /**
     * @return list<Product>
     */
    public function findByProducer(User $producer): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.category', 'c')
            ->addSelect('(CASE WHEN c.name IS NULL THEN 1 ELSE 0 END) AS HIDDEN category_null_last')
            ->addSelect('LOWER(c.name) AS HIDDEN category_name_sort')
            ->addSelect('LOWER(p.name) AS HIDDEN product_name_sort')
            ->andWhere('p.producer = :producer')
            ->setParameter('producer', $producer)
            ->orderBy('category_null_last', 'ASC')
            ->addOrderBy('category_name_sort', 'ASC')
            ->addOrderBy('product_name_sort', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<Product>
     */
    public function findAvailableByProducer(User $producer): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.category', 'c')
            ->addSelect('(CASE WHEN c.name IS NULL THEN 1 ELSE 0 END) AS HIDDEN category_null_last')
            ->addSelect('LOWER(c.name) AS HIDDEN category_name_sort')
            ->addSelect('LOWER(p.name) AS HIDDEN product_name_sort')
            ->andWhere('p.producer = :producer')
            ->andWhere('p.isAvailable = true')
            ->setParameter('producer', $producer)
            ->orderBy('category_null_last', 'ASC')
            ->addOrderBy('category_name_sort', 'ASC')
            ->addOrderBy('product_name_sort', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneForProducer(int $id, User $producer): ?Product
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.id = :id')
            ->andWhere('p.producer = :producer')
            ->setParameter('id', $id)
            ->setParameter('producer', $producer)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
