<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Enforce category.producer_id NOT NULL (no global categories)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DELETE FROM category WHERE producer_id IS NULL');
        $this->addSql('ALTER TABLE category CHANGE producer_id producer_id INT NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category CHANGE producer_id producer_id INT DEFAULT NULL');
    }
}
