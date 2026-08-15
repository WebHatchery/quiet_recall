<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;

final class MigrationRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function migrateDirectory(string $directory): array
    {
        $this->ensureLedger();
        $files = glob(rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '*.sql');
        if ($files === false) {
            throw new RuntimeException('Migration directory could not be read.');
        }
        sort($files, SORT_STRING);

        $applied = [];
        foreach ($files as $file) {
            $name = basename($file);
            $sql = file_get_contents($file);
            if (!is_string($sql)) {
                throw new RuntimeException("Migration {$name} could not be read.");
            }
            $checksum = hash('sha256', $sql);
            $existing = $this->checksumFor($name);
            if ($existing !== null) {
                if (!hash_equals($existing, $checksum)) {
                    throw new RuntimeException("Applied migration {$name} has changed.");
                }
                continue;
            }

            foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
                $this->db->exec($statement);
            }
            $this->record($name, $checksum);
            $applied[] = $name;
        }
        return $applied;
    }

    private function ensureLedger(): void
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS quiet_recall_schema_migrations (
                migration VARCHAR(255) PRIMARY KEY,
                checksum CHAR(64) NOT NULL,
                applied_at DATETIME NOT NULL
             ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    private function checksumFor(string $migration): ?string
    {
        $statement = $this->db->prepare(
            'SELECT checksum FROM quiet_recall_schema_migrations WHERE migration = :migration'
        );
        $statement->execute(['migration' => $migration]);
        $checksum = $statement->fetchColumn();
        return is_string($checksum) ? $checksum : null;
    }

    private function record(string $migration, string $checksum): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO quiet_recall_schema_migrations (migration, checksum, applied_at)
             VALUES (:migration, :checksum, :applied_at)'
        );
        $statement->execute([
            'migration' => $migration,
            'checksum' => $checksum,
            'applied_at' => gmdate('Y-m-d H:i:s'),
        ]);
    }
}
