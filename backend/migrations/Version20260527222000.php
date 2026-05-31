<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260527222000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add producer profile fields for settings page';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD producer_photo_url VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE `user` ADD producer_organic TINYINT(1) DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE `user` ADD producer_description VARCHAR(500) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP producer_photo_url');
        $this->addSql('ALTER TABLE `user` DROP producer_organic');
        $this->addSql('ALTER TABLE `user` DROP producer_description');
    }
}
