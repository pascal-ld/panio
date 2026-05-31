<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add enabled flag on user accounts';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD enabled TINYINT(1) DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP enabled');
    }
}
