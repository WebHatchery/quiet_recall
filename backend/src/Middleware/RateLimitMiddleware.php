<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Database;
use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use App\Repositories\RateLimitRepository;
use RuntimeException;

final class RateLimitMiddleware
{
    public function __invoke(Request $request, Response $response): Request|Response
    {
        $limit = $this->positiveInteger('RATE_LIMIT_REQUESTS');
        $windowSeconds = $this->positiveInteger('RATE_LIMIT_WINDOW_SECONDS');
        $user = $request->getAttribute('auth_user', []);
        $identity = is_array($user) && is_string($user['id'] ?? null)
            ? 'user:' . $user['id']
            : 'ip:' . (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $identifierHash = hash('sha256', $identity);
        $bucket = is_array($user) && is_string($user['id'] ?? null)
            ? (new RateLimitRepository(Database::getConnection()))->increment(
                $identifierHash,
                gmdate('Y-m-d H:i:s'),
                gmdate('Y-m-d H:i:s', time() - $windowSeconds)
            )
            : $this->incrementAnonymousBucket($identifierHash, $windowSeconds);
        if (is_array($bucket) && (int) $bucket['request_count'] > $limit) {
            $startedAt = strtotime((string) $bucket['window_started_at']) ?: time();
            $retryAfter = max(1, ($startedAt + $windowSeconds) - time());
            $response->withHeader('Retry-After', (string) $retryAfter);
            $response->error('Too many requests', 429, ['retry_after' => $retryAfter]);
            return $response;
        }

        return $request;
    }

    private function incrementAnonymousBucket(string $identifierHash, int $windowSeconds): array
    {
        $configuredPath = Env::required('RATE_LIMIT_STORAGE_PATH');
        $directory = str_starts_with($configuredPath, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $configuredPath)
            ? $configuredPath
            : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $configuredPath;
        if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
            throw new RuntimeException('Rate limit storage directory could not be created.');
        }

        $path = $directory . DIRECTORY_SEPARATOR . $identifierHash . '.json';
        $handle = fopen($path, 'c+');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            throw new RuntimeException('Rate limit storage could not be locked.');
        }
        try {
            $raw = stream_get_contents($handle);
            $bucket = is_string($raw) ? json_decode($raw, true) : null;
            $now = time();
            if (!is_array($bucket) || (int) ($bucket['started_at'] ?? 0) <= $now - $windowSeconds) {
                $bucket = ['started_at' => $now, 'request_count' => 1];
            } else {
                $bucket['request_count'] = (int) $bucket['request_count'] + 1;
            }
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($bucket, JSON_THROW_ON_ERROR));
            fflush($handle);
            return [
                'window_started_at' => gmdate('Y-m-d H:i:s', (int) $bucket['started_at']),
                'request_count' => (int) $bucket['request_count'],
            ];
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function positiveInteger(string $name): int
    {
        $value = filter_var(Env::required($name), FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) {
            throw new RuntimeException("{$name} must be a positive integer.");
        }
        return $value;
    }
}
