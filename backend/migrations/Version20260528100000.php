<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260528100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename producer photo URL column to path (upload only)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` CHANGE producer_photo_url producer_photo_path VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` CHANGE producer_photo_path producer_photo_url VARCHAR(255) DEFAULT NULL');
    }
}
