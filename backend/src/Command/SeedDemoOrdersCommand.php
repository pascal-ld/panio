<?php

namespace App\Command;

use App\Entity\CustomerOrder;
use App\Entity\OrderLine;
use App\Enum\OrderStatus;
use App\Enum\SaleUnit;
use App\Repository\DistributionPointRepository;
use App\Repository\ProductRepository;
use App\Repository\UserRepository;
use App\Service\OrderDeadlineCalculator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:orders:seed-demo',
    description: 'Crée des commandes de démonstration (passées et actives) pour le client test',
)]
final class SeedDemoOrdersCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly ProductRepository $productRepository,
        private readonly DistributionPointRepository $pointRepository,
        private readonly OrderDeadlineCalculator $deadlineCalculator,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $client = $this->userRepository->findOneBy(['email' => 'client@panio.local']);
        $producer = $this->userRepository->findOneBy(['email' => 'paysan@panio.local']);
        if ($client === null || $producer === null) {
            $io->error('Comptes client@panio.local ou paysan@panio.local introuvables.');

            return Command::FAILURE;
        }

        $point = $this->pointRepository->findOneBy(['producer' => $producer]);
        if ($point === null) {
            $io->error('Aucun lieu de distribution pour le producteur.');

            return Command::FAILURE;
        }

        $products = $this->productRepository->findByProducer($producer);
        if ($products === []) {
            $io->error('Aucun produit pour le producteur.');

            return Command::FAILURE;
        }

        $samples = [
            ['date' => '2026-05-10', 'status' => OrderStatus::Retrieved, 'lines' => [[0, 1], [1, 2]]],
            ['date' => '2026-05-12', 'status' => OrderStatus::Cancelled, 'lines' => [[0, 3]]],
            ['date' => '2026-05-14', 'status' => OrderStatus::Absent, 'lines' => [[2, 1]]],
            ['date' => '2026-05-17', 'status' => OrderStatus::Prepared, 'lines' => [[0, 2], [2, 1]]],
        ];

        $created = 0;
        foreach ($samples as $sample) {
            $collectionDate = \DateTimeImmutable::createFromFormat('!Y-m-d', $sample['date'], new \DateTimeZone('Europe/Paris'));
            if ($collectionDate === false) {
                continue;
            }

            $existing = $this->entityManager->getRepository(CustomerOrder::class)->findOneBy([
                'client' => $client,
                'producer' => $producer,
                'collectionDate' => $collectionDate,
            ]);
            if ($existing !== null) {
                continue;
            }

            $order = new CustomerOrder();
            $order->setClient($client);
            $order->setProducer($producer);
            $order->setDistributionPoint($point);
            $order->setCollectionDate($collectionDate);
            $order->setStatus($sample['status']);
            $order->setOrderDeadlineAt($this->deadlineCalculator->compute($collectionDate, $point));

            foreach ($sample['lines'] as [$productIndex, $qty]) {
                $product = $products[$productIndex % count($products)];
                $saleUnit = $product->getSaleUnit() ?? SaleUnit::Piece;
                $line = new OrderLine();
                $line->setProduct($product);
                $line->setProductName($product->getName() ?? 'Produit');
                $line->setQuantity($qty);
                $line->setUnitPrice($product->getPrice() ?? '0');
                $line->setSaleUnit($saleUnit);
                $order->addLine($line);
            }

            $this->entityManager->persist($order);
            ++$created;
        }

        $this->entityManager->flush();
        $io->success(sprintf('%d commande(s) de démo créée(s). La commande du 20 mai (réservée) est conservée si elle existait déjà.', $created));

        return Command::SUCCESS;
    }
}
