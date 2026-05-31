<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add email verification fields to user table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD is_email_verified TINYINT(1) DEFAULT 0 NOT NULL, ADD email_verification_token VARCHAR(64) DEFAULT NULL, ADD email_verification_expires_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_EMAIL_VERIFICATION_TOKEN ON `user` (email_verification_token)');
        $this->addSql('UPDATE `user` SET is_email_verified = 1');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_EMAIL_VERIFICATION_TOKEN ON `user`');
        $this->addSql('ALTER TABLE `user` DROP is_email_verified, DROP email_verification_token, DROP email_verification_expires_at');
    }
}
