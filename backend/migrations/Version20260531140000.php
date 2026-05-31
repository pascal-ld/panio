<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260531140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace single client favorite producer with many-to-many favorites';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE client_favorite_producer (client_id INT NOT NULL, producer_id INT NOT NULL, INDEX IDX_CLIENT_FAVORITE_CLIENT (client_id), INDEX IDX_CLIENT_FAVORITE_PRODUCER (producer_id), PRIMARY KEY(client_id, producer_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE client_favorite_producer ADD CONSTRAINT FK_CLIENT_FAVORITE_CLIENT FOREIGN KEY (client_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE client_favorite_producer ADD CONSTRAINT FK_CLIENT_FAVORITE_PRODUCER FOREIGN KEY (producer_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('INSERT INTO client_favorite_producer (client_id, producer_id) SELECT id, favorite_producer_id FROM `user` WHERE favorite_producer_id IS NOT NULL');
        $this->addSql('ALTER TABLE `user` DROP FOREIGN KEY FK_USER_FAVORITE_PRODUCER');
        $this->addSql('DROP INDEX IDX_USER_FAVORITE_PRODUCER ON `user`');
        $this->addSql('ALTER TABLE `user` DROP favorite_producer_id');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD favorite_producer_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE `user` ADD CONSTRAINT FK_USER_FAVORITE_PRODUCER FOREIGN KEY (favorite_producer_id) REFERENCES `user` (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_USER_FAVORITE_PRODUCER ON `user` (favorite_producer_id)');
        $this->addSql('UPDATE `user` u INNER JOIN (SELECT client_id, MIN(producer_id) AS producer_id FROM client_favorite_producer GROUP BY client_id) f ON u.id = f.client_id SET u.favorite_producer_id = f.producer_id');
        $this->addSql('ALTER TABLE client_favorite_producer DROP FOREIGN KEY FK_CLIENT_FAVORITE_CLIENT');
        $this->addSql('ALTER TABLE client_favorite_producer DROP FOREIGN KEY FK_CLIENT_FAVORITE_PRODUCER');
        $this->addSql('DROP TABLE client_favorite_producer');
    }
}
