<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516210000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Disponibilité des produits (is_available)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD is_available TINYINT(1) DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP is_available');
    }
}
