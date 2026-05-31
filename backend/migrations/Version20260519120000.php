<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Categories owned by producer; optional product category';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category ADD producer_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_64C19C189B658FE FOREIGN KEY (producer_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_64C19C189B658FE ON category (producer_id)');
        $this->addSql('DROP INDEX UNIQ_64C19C1989D9B62 ON category');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_CATEGORY_PRODUCER_SLUG ON category (producer_id, slug)');

        $this->addSql('ALTER TABLE product DROP FOREIGN KEY FK_D34A04AD12469DE2');
        $this->addSql('ALTER TABLE product CHANGE category_id category_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE product ADD CONSTRAINT FK_D34A04AD12469DE2 FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE SET NULL');
    }

    public function postUp(Schema $schema): void
    {
        $pairs = $this->connection->fetchAllAssociative(
            'SELECT DISTINCT p.producer_id, p.category_id
             FROM product p
             WHERE p.category_id IS NOT NULL',
        );

        foreach ($pairs as $pair) {
            $producerId = (int) $pair['producer_id'];
            $categoryId = (int) $pair['category_id'];

            $category = $this->connection->fetchAssociative(
                'SELECT id, name, slug, producer_id FROM category WHERE id = ?',
                [$categoryId],
            );
            if ($category === false) {
                continue;
            }

            if ($category['producer_id'] !== null && (int) $category['producer_id'] === $producerId) {
                continue;
            }

            $otherProducers = (int) $this->connection->fetchOne(
                'SELECT COUNT(DISTINCT producer_id) FROM product WHERE category_id = ? AND producer_id <> ?',
                [$categoryId, $producerId],
            );

            if ($category['producer_id'] === null && $otherProducers === 0) {
                $this->connection->executeStatement(
                    'UPDATE category SET producer_id = ? WHERE id = ?',
                    [$producerId, $categoryId],
                );
                continue;
            }

            $baseSlug = (string) $category['slug'];
            $slug = $baseSlug;
            $suffix = 2;
            while ($this->isSlugTaken($producerId, $slug)) {
                $slug = $baseSlug.'-'.$suffix;
                ++$suffix;
            }

            $this->connection->insert('category', [
                'name' => $category['name'],
                'slug' => $slug,
                'producer_id' => $producerId,
            ]);
            $newCategoryId = (int) $this->connection->lastInsertId();

            $this->connection->executeStatement(
                'UPDATE product SET category_id = ? WHERE producer_id = ? AND category_id = ?',
                [$newCategoryId, $producerId, $categoryId],
            );
        }

        $this->connection->executeStatement(
            'DELETE FROM category WHERE producer_id IS NULL',
        );
    }

    private function isSlugTaken(int $producerId, string $slug): bool
    {
        $count = $this->connection->fetchOne(
            'SELECT COUNT(*) FROM category WHERE producer_id = ? AND slug = ?',
            [$producerId, $slug],
        );

        return (int) $count > 0;
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP FOREIGN KEY FK_D34A04AD12469DE2');
        $this->addSql('ALTER TABLE product CHANGE category_id category_id INT NOT NULL');
        $this->addSql('ALTER TABLE product ADD CONSTRAINT FK_D34A04AD12469DE2 FOREIGN KEY (category_id) REFERENCES category (id)');
        $this->addSql('ALTER TABLE category DROP FOREIGN KEY FK_64C19C189B658FE');
        $this->addSql('DROP INDEX UNIQ_CATEGORY_PRODUCER_SLUG ON category');
        $this->addSql('DROP INDEX IDX_64C19C189B658FE ON category');
        $this->addSql('ALTER TABLE category DROP producer_id');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_64C19C1989D9B62 ON category (slug)');
    }
}
