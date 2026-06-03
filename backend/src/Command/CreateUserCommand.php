<?php

namespace App\Command;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use App\Service\PasswordPolicy;
use App\Service\PasswordSetupService;
use App\Service\ProducerSlugGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:user:create',
    description: 'Crée un utilisateur (bootstrap ou maintenance CLI)',
)]
final class CreateUserCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly PasswordPolicy $passwordPolicy,
        private readonly PasswordSetupService $passwordSetupService,
        private readonly ProducerSlugGenerator $slugGenerator,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Adresse e-mail')
            ->addArgument('password', InputArgument::OPTIONAL, 'Mot de passe (obligatoire sauf avec --invite)')
            ->addOption('role', null, InputOption::VALUE_REQUIRED, 'client, producteur ou super_admin', 'super_admin')
            ->addOption('full-name', null, InputOption::VALUE_REQUIRED, 'Nom affiché')
            ->addOption('invite', null, InputOption::VALUE_NONE, 'Envoyer une invitation par e-mail au lieu du mot de passe fourni');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $email = mb_strtolower(trim((string) $input->getArgument('email')));
        $password = (string) ($input->getArgument('password') ?? '');
        $role = $this->resolveRole((string) $input->getOption('role'));
        $fullName = $this->normalizeOptional((string) $input->getOption('full-name'));
        $sendInvite = (bool) $input->getOption('invite');

        if ($this->userRepository->findOneBy(['email' => $email]) !== null) {
            $io->error('Un utilisateur existe déjà avec cet e-mail.');

            return Command::FAILURE;
        }

        if (!$sendInvite && $password === '') {
            $io->error('Mot de passe requis (ou utilisez --invite).');

            return Command::FAILURE;
        }

        if (!$sendInvite) {
            $passwordError = $this->passwordPolicy->validate($password);
            if ($passwordError !== null) {
                $io->error($passwordError);

                return Command::FAILURE;
            }
        }

        $user = new User();
        $user->setEmail($email);
        $user->setRole($role);
        $user->setFullName($fullName);
        $user->setEnabled(true);

        if ($role === UserRole::Producteur) {
            $user->setSlug($this->slugGenerator->generateFromName($fullName ?? $email));
        }

        if ($sendInvite) {
            $user->setIsEmailVerified(false);
            $user->setPassword($this->passwordHasher->hashPassword($user, $this->passwordPolicy->generateTemporary()));
            $this->entityManager->persist($user);
            $this->entityManager->flush();
            $this->passwordSetupService->issueInvitation($user);
            $io->success(sprintf('Utilisateur %s créé. Invitation envoyée par e-mail.', $email));
        } else {
            $user->setPassword($this->passwordHasher->hashPassword($user, $password));
            $user->markEmailVerified();
            $user->clearPasswordSetupInvitation();
            $this->entityManager->persist($user);
            $this->entityManager->flush();
            $io->success(sprintf('Utilisateur %s créé (%s). Connexion immédiate possible.', $email, $role->label()));
        }

        return Command::SUCCESS;
    }

    private function resolveRole(string $roleInput): UserRole
    {
        return match (mb_strtolower(trim($roleInput))) {
            'client', 'role_client' => UserRole::Client,
            'producteur', 'paysan', 'role_producteur' => UserRole::Producteur,
            'super_admin', 'superadmin', 'admin', 'role_super_admin' => UserRole::SuperAdmin,
            default => throw new \InvalidArgumentException(
                'Rôle invalide. Utilisez : client, producteur ou super_admin.',
            ),
        };
    }

    private function normalizeOptional(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
