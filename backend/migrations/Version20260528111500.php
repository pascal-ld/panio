<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260528111500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optional max baskets per distribution point';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE distribution_point ADD max_baskets INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE distribution_point DROP max_baskets');
    }
}
