<?php

namespace App\Repository;

use App\Entity\CustomerOrder;
use App\Entity\User;
use App\Enum\OrderStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CustomerOrder>
 */
class CustomerOrderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CustomerOrder::class);
    }

    public function findActiveForSlot(
        User $client,
        User $producer,
        int $distributionPointId,
        \DateTimeImmutable $collectionDate,
    ): ?CustomerOrder {
        return $this->createQueryBuilder('o')
            ->innerJoin('o.distributionPoint', 'dp')
            ->andWhere('o.client = :client')
            ->andWhere('o.producer = :producer')
            ->andWhere('dp.id = :pointId')
            ->andWhere('o.collectionDate = :collectionDate')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('client', $client)
            ->setParameter('producer', $producer)
            ->setParameter('pointId', $distributionPointId)
            ->setParameter('collectionDate', $collectionDate)
            ->setParameter('statuses', [OrderStatus::Draft, OrderStatus::Reserved, OrderStatus::Prepared])
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @return list<CustomerOrder>
     */
    public function findByProducerAndDate(
        User $producer,
        \DateTimeImmutable $collectionDate,
        ?OrderStatus $status = null,
    ): array {
        $qb = $this->createQueryBuilder('o')
            ->andWhere('o.producer = :producer')
            ->andWhere('o.collectionDate = :collectionDate')
            ->setParameter('producer', $producer)
            ->setParameter('collectionDate', $collectionDate)
            ->orderBy('o.updatedAt', 'DESC');

        if ($status !== null) {
            $qb->andWhere('o.status = :status')->setParameter('status', $status);
        } else {
            $qb->andWhere('o.status NOT IN (:excluded)')
                ->setParameter('excluded', [OrderStatus::Draft, OrderStatus::Cancelled]);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return list<CustomerOrder>
     */
    public function findForProducerBroadcast(User $producer, \DateTimeImmutable $collectionDate): array
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.producer = :producer')
            ->andWhere('o.collectionDate = :collectionDate')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('producer', $producer)
            ->setParameter('collectionDate', $collectionDate)
            ->setParameter('statuses', [OrderStatus::Reserved, OrderStatus::Prepared])
            ->orderBy('o.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<User>
     */
    public function findDistinctClientsByProducer(User $producer, string $query = '', int $limit = 30): array
    {
        $qb = $this->getEntityManager()->createQueryBuilder()
            ->select('c')
            ->from(\App\Entity\User::class, 'c')
            ->innerJoin(\App\Entity\CustomerOrder::class, 'o', 'WITH', 'o.client = c')
            ->andWhere('o.producer = :producer')
            ->andWhere('c.roles LIKE :clientRole')
            ->setParameter('producer', $producer)
            ->setParameter('clientRole', '%"ROLE_CLIENT"%')
            ->groupBy('c.id')
            ->orderBy('c.fullName', 'ASC')
            ->setMaxResults($limit);

        $query = trim($query);
        if ($query !== '') {
            $qb
                ->andWhere('LOWER(c.fullName) LIKE :q OR LOWER(c.email) LIKE :q OR LOWER(c.phone) LIKE :q')
                ->setParameter('q', '%'.mb_strtolower($query).'%');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @param list<OrderStatus> $statuses
     *
     * @return list<array{productId: int, productName: string, saleUnit: string, totalQuantity: string}>
     */
    public function aggregateHarvestForDate(
        User $producer,
        \DateTimeImmutable $collectionDate,
        array $statuses,
    ): array {
        if ($statuses === []) {
            return [];
        }

        return $this->getEntityManager()->createQueryBuilder()
            ->select('p.id AS productId', 'l.productName', 'l.saleUnit', 'SUM(l.quantity) AS totalQuantity')
            ->from(\App\Entity\OrderLine::class, 'l')
            ->join('l.customerOrder', 'o')
            ->join('l.product', 'p')
            ->where('o.producer = :producer')
            ->andWhere('o.collectionDate = :collectionDate')
            ->andWhere('o.status IN (:statuses)')
            ->groupBy('p.id', 'l.productName', 'l.saleUnit')
            ->orderBy('l.productName', 'ASC')
            ->setParameter('producer', $producer)
            ->setParameter('collectionDate', $collectionDate)
            ->setParameter('statuses', $statuses)
            ->getQuery()
            ->getArrayResult();
    }

    /**
     * @return list<CustomerOrder>
     */
    public function findOrdersToMarkAbsent(\DateTimeImmutable $beforeCollectionDate): array
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.collectionDate < :beforeDate')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('beforeDate', $beforeCollectionDate)
            ->setParameter('statuses', [OrderStatus::Reserved, OrderStatus::Prepared])
            ->getQuery()
            ->getResult();
    }

    /**
     * @return list<CustomerOrder>
     */
    public function findByClient(User $client, string $scope = 'all', ?User $producer = null): array
    {
        $qb = $this->createQueryBuilder('o')
            ->andWhere('o.client = :client')
            ->setParameter('client', $client)
            ->orderBy('o.collectionDate', 'DESC')
            ->addOrderBy('o.updatedAt', 'DESC');

        if ($producer !== null) {
            $qb->andWhere('o.producer = :producer')->setParameter('producer', $producer);
        }

        if ($scope === 'active') {
            $qb->andWhere('o.status IN (:statuses)')
                ->setParameter('statuses', [OrderStatus::Draft, OrderStatus::Reserved, OrderStatus::Prepared]);
        } elseif ($scope === 'history') {
            $qb->andWhere('o.status IN (:statuses)')
                ->setParameter('statuses', [OrderStatus::Retrieved, OrderStatus::Cancelled, OrderStatus::Absent]);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return list<\DateTimeImmutable>
     */
    public function findDistinctCollectionDates(User $producer, ?OrderStatus $status = null): array
    {
        $qb = $this->createQueryBuilder('o')
            ->select('DISTINCT o.collectionDate')
            ->andWhere('o.producer = :producer')
            ->setParameter('producer', $producer)
            ->orderBy('o.collectionDate', 'ASC');

        if ($status !== null) {
            $qb->andWhere('o.status = :status')->setParameter('status', $status);
        } else {
            $qb->andWhere('o.status IN (:statuses)')
                ->setParameter('statuses', [OrderStatus::Reserved, OrderStatus::Prepared, OrderStatus::Retrieved, OrderStatus::Absent]);
        }

        $rows = $qb->getQuery()->getSingleColumnResult();

        return array_map(
            static fn (mixed $date) => $date instanceof \DateTimeImmutable
                ? $date
                : new \DateTimeImmutable((string) $date),
            $rows,
        );
    }

    /**
     * @return array<int, int> productId => reserved quantity
     */
    public function aggregateReservedQuantitiesForDate(
        User $producer,
        \DateTimeImmutable $collectionDate,
        ?int $excludeOrderId = null,
    ): array {
        $qb = $this->getEntityManager()->createQueryBuilder()
            ->select('p.id AS productId', 'SUM(l.quantity) AS totalQuantity')
            ->from(\App\Entity\OrderLine::class, 'l')
            ->join('l.customerOrder', 'o')
            ->join('l.product', 'p')
            ->where('o.producer = :producer')
            ->andWhere('o.collectionDate = :collectionDate')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('producer', $producer)
            ->setParameter('collectionDate', $collectionDate)
            ->setParameter('statuses', [OrderStatus::Reserved, OrderStatus::Prepared, OrderStatus::Retrieved])
            ->groupBy('p.id');

        if ($excludeOrderId !== null) {
            $qb->andWhere('o.id != :excludeOrderId')
                ->setParameter('excludeOrderId', $excludeOrderId);
        }

        $rows = $qb->getQuery()->getArrayResult();
        $result = [];
        foreach ($rows as $row) {
            $productId = (int) ($row['productId'] ?? 0);
            if ($productId <= 0) {
                continue;
            }
            $result[$productId] = (int) ($row['totalQuantity'] ?? 0);
        }

        return $result;
    }

    public function countBySlot(
        User $producer,
        \DateTimeImmutable $collectionDate,
        int $distributionPointId,
        ?int $excludeOrderId = null,
    ): int {
        $qb = $this->createQueryBuilder('o')
            ->select('COUNT(o.id)')
            ->innerJoin('o.distributionPoint', 'dp')
            ->andWhere('o.producer = :producer')
            ->andWhere('o.collectionDate = :collectionDate')
            ->andWhere('dp.id = :distributionPointId')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('producer', $producer)
            ->setParameter('collectionDate', $collectionDate)
            ->setParameter('distributionPointId', $distributionPointId)
            ->setParameter('statuses', [OrderStatus::Reserved, OrderStatus::Prepared, OrderStatus::Retrieved, OrderStatus::Absent]);

        if ($excludeOrderId !== null) {
            $qb->andWhere('o.id != :excludeOrderId')
                ->setParameter('excludeOrderId', $excludeOrderId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * @return array<string, int>
     */
    public function countBySlotsInDateRange(
        User $producer,
        \DateTimeImmutable $startDate,
        \DateTimeImmutable $endDate,
    ): array {
        $rows = $this->createQueryBuilder('o')
            ->select('o.collectionDate AS collectionDate', 'IDENTITY(o.distributionPoint) AS distributionPointId', 'COUNT(o.id) AS total')
            ->andWhere('o.producer = :producer')
            ->andWhere('o.collectionDate >= :startDate')
            ->andWhere('o.collectionDate <= :endDate')
            ->andWhere('o.status IN (:statuses)')
            ->groupBy('o.collectionDate', 'distributionPointId')
            ->setParameter('producer', $producer)
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('statuses', [OrderStatus::Reserved, OrderStatus::Prepared, OrderStatus::Retrieved, OrderStatus::Absent])
            ->getQuery()
            ->getArrayResult();

        $result = [];
        foreach ($rows as $row) {
            $date = $row['collectionDate'] instanceof \DateTimeInterface
                ? $row['collectionDate']->format('Y-m-d')
                : (string) $row['collectionDate'];
            $pointId = (int) ($row['distributionPointId'] ?? 0);
            if ($pointId <= 0 || $date === '') {
                continue;
            }
            $result[$date.'-'.$pointId] = (int) ($row['total'] ?? 0);
        }

        return $result;
    }

    public function countByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('o')
            ->select('COUNT(o.id)')
            ->andWhere('o.client = :user OR o.producer = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
