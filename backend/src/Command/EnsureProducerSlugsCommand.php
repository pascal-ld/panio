<?php

namespace App\Command;

use App\Enum\UserRole;
use App\Repository\UserRepository;
use App\Service\ProducerSlugGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:producer:ensure-slugs',
    description: 'Génère les slugs manquants pour les producteurs',
)]
final class EnsureProducerSlugsCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly ProducerSlugGenerator $slugGenerator,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $count = 0;

        foreach ($this->userRepository->findAll() as $user) {
            if (!$user->hasRole(UserRole::Producteur) || $user->getSlug() !== null) {
                continue;
            }

            $name = $user->getFullName() ?? $user->getEmail();
            $user->setSlug($this->slugGenerator->generateFromName($name, $user->getId()));
            ++$count;
        }

        $this->entityManager->flush();
        $io->success(sprintf('%d slug(s) généré(s).', $count));

        return Command::SUCCESS;
    }
}
