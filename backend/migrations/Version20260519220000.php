<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optional next slot stock limit on products';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD next_slot_max_quantity INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP next_slot_max_quantity');
    }
}

