<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Producer slug, booking window, client favorite producer';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD slug VARCHAR(80) DEFAULT NULL, ADD advance_booking_days INT DEFAULT 10 NOT NULL, ADD favorite_producer_id INT DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_PRODUCER_SLUG ON `user` (slug)');
        $this->addSql('ALTER TABLE `user` ADD CONSTRAINT FK_USER_FAVORITE_PRODUCER FOREIGN KEY (favorite_producer_id) REFERENCES `user` (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_USER_FAVORITE_PRODUCER ON `user` (favorite_producer_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP FOREIGN KEY FK_USER_FAVORITE_PRODUCER');
        $this->addSql('DROP INDEX UNIQ_PRODUCER_SLUG ON `user`');
        $this->addSql('DROP INDEX IDX_USER_FAVORITE_PRODUCER ON `user`');
        $this->addSql('ALTER TABLE `user` DROP slug, DROP advance_booking_days, DROP favorite_producer_id');
    }
}
