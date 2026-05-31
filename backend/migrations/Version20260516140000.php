<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Producer profile fields and distribution points';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD full_name VARCHAR(150) DEFAULT NULL, ADD phone VARCHAR(30) DEFAULT NULL');
        $this->addSql('CREATE TABLE distribution_point (id INT AUTO_INCREMENT NOT NULL, location_label VARCHAR(180) NOT NULL, distribution_day VARCHAR(10) NOT NULL, distribution_start_time TIME NOT NULL, distribution_end_time TIME NOT NULL, order_deadline_day VARCHAR(10) NOT NULL, order_deadline_time TIME NOT NULL, producer_id INT NOT NULL, INDEX IDX_5C57605C89B658FE (producer_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE distribution_point ADD CONSTRAINT FK_5C57605C89B658FE FOREIGN KEY (producer_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE distribution_point DROP FOREIGN KEY FK_5C57605C89B658FE');
        $this->addSql('DROP TABLE distribution_point');
        $this->addSql('ALTER TABLE `user` DROP full_name, DROP phone');
    }
}
