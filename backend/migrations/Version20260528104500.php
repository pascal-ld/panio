<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260528104500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add producer comment on customer orders';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE customer_order ADD producer_comment LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE customer_order DROP producer_comment');
    }
}
