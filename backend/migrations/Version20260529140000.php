<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260529140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename ROLE_PAYSAN to ROLE_PRODUCTEUR in user roles';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE `user` SET roles = REPLACE(roles, 'ROLE_PAYSAN', 'ROLE_PRODUCTEUR') WHERE roles LIKE '%ROLE_PAYSAN%'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE `user` SET roles = REPLACE(roles, 'ROLE_PRODUCTEUR', 'ROLE_PAYSAN') WHERE roles LIKE '%ROLE_PRODUCTEUR%'");
    }
}
