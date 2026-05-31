<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Commandes client (customer_order, order_line)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE customer_order (
            id INT AUTO_INCREMENT NOT NULL,
            client_id INT NOT NULL,
            producer_id INT NOT NULL,
            distribution_point_id INT NOT NULL,
            collection_date DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\',
            status VARCHAR(20) NOT NULL,
            order_deadline_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_CLIENT_ORDER_CLIENT (client_id),
            INDEX IDX_CLIENT_ORDER_PRODUCER (producer_id),
            INDEX IDX_CLIENT_ORDER_POINT (distribution_point_id),
            INDEX IDX_CLIENT_ORDER_COLLECTION (collection_date),
            INDEX IDX_CLIENT_ORDER_STATUS (status),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE order_line (
            id INT AUTO_INCREMENT NOT NULL,
            customer_order_id INT NOT NULL,
            product_id INT NOT NULL,
            product_name VARCHAR(180) NOT NULL,
            quantity INT NOT NULL,
            unit_price NUMERIC(10, 2) NOT NULL,
            sale_unit VARCHAR(20) NOT NULL,
            INDEX IDX_ORDER_LINE_ORDER (customer_order_id),
            INDEX IDX_ORDER_LINE_PRODUCT (product_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE customer_order ADD CONSTRAINT FK_CLIENT_ORDER_CLIENT FOREIGN KEY (client_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE customer_order ADD CONSTRAINT FK_CLIENT_ORDER_PRODUCER FOREIGN KEY (producer_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE customer_order ADD CONSTRAINT FK_CLIENT_ORDER_POINT FOREIGN KEY (distribution_point_id) REFERENCES distribution_point (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE order_line ADD CONSTRAINT FK_ORDER_LINE_ORDER FOREIGN KEY (customer_order_id) REFERENCES customer_order (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE order_line ADD CONSTRAINT FK_ORDER_LINE_PRODUCT FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE order_line DROP FOREIGN KEY FK_ORDER_LINE_ORDER');
        $this->addSql('ALTER TABLE order_line DROP FOREIGN KEY FK_ORDER_LINE_PRODUCT');
        $this->addSql('ALTER TABLE customer_order DROP FOREIGN KEY FK_CLIENT_ORDER_CLIENT');
        $this->addSql('ALTER TABLE customer_order DROP FOREIGN KEY FK_CLIENT_ORDER_PRODUCER');
        $this->addSql('ALTER TABLE customer_order DROP FOREIGN KEY FK_CLIENT_ORDER_POINT');
        $this->addSql('DROP TABLE order_line');
        $this->addSql('DROP TABLE customer_order');
    }
}
