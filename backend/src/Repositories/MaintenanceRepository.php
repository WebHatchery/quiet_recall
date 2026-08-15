<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class MaintenanceRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function deleteExpiredIdempotencyKeys(): int
    {
        $statement = $this->db->prepare(
            'DELETE FROM quiet_recall_idempotency_keys WHERE expires_at < :now'
        );
        $statement->execute(['now' => gmdate('Y-m-d H:i:s')]);
        return $statement->rowCount();
    }

    public function deleteStaleGuests(int $retentionDays): int
    {
        $statement = $this->db->prepare(
            'DELETE FROM quiet_recall_players
             WHERE is_guest = 1 AND updated_at < :cutoff'
        );
        $statement->execute([
            'cutoff' => gmdate('Y-m-d H:i:s', time() - ($retentionDays * 86400)),
        ]);
        return $statement->rowCount();
    }

    public function deleteStaleRateLimits(): int
    {
        $statement = $this->db->prepare(
            'DELETE FROM quiet_recall_rate_limits WHERE updated_at < :cutoff'
        );
        $statement->execute(['cutoff' => gmdate('Y-m-d H:i:s', time() - 86400)]);
        return $statement->rowCount();
    }
}
