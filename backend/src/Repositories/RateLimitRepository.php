<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;

final class RateLimitRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function increment(string $identifierHash, string $now, string $resetBefore): array
    {
        $statement = $this->db->prepare(
            'INSERT INTO quiet_recall_rate_limits
                (identifier_hash, window_started_at, request_count, updated_at)
             VALUES (:identifier_hash, :window_started_at, 1, :updated_at)
             ON DUPLICATE KEY UPDATE
                request_count = IF(window_started_at <= :reset_before_count, 1, request_count + 1),
                window_started_at = IF(
                    window_started_at <= :reset_before_window,
                    VALUES(window_started_at),
                    window_started_at
                ),
                updated_at = VALUES(updated_at)'
        );
        $statement->execute([
            'identifier_hash' => $identifierHash,
            'window_started_at' => $now,
            'updated_at' => $now,
            'reset_before_count' => $resetBefore,
            'reset_before_window' => $resetBefore,
        ]);

        $read = $this->db->prepare(
            'SELECT window_started_at, request_count
             FROM quiet_recall_rate_limits WHERE identifier_hash = :identifier_hash'
        );
        $read->execute(['identifier_hash' => $identifierHash]);
        $bucket = $read->fetch(PDO::FETCH_ASSOC);
        if (!is_array($bucket)) {
            throw new RuntimeException('Rate limit bucket could not be read.');
        }
        return $bucket;
    }
}
