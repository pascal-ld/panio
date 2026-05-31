<?php

namespace App\Command;

use App\Service\OrderManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:orders:mark-absent',
    description: 'Passe en « Absent » (J+2) les commandes non récupérées et notifie le client',
)]
final class MarkAbsentOrdersCommand extends Command
{
    public function __construct(
        private readonly OrderManager $orderManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $count = $this->orderManager->markAbsentOrders();
        $io->success(sprintf('%d commande(s) passée(s) en « Absent ».', $count));

        return Command::SUCCESS;
    }
}
