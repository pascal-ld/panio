<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260531120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add password setup invitation token fields on user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD password_setup_token VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE `user` ADD password_setup_expires_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP password_setup_token');
        $this->addSql('ALTER TABLE `user` DROP password_setup_expires_at');
    }
}
