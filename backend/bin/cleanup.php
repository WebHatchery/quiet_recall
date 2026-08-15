<?php

declare(strict_types=1);

$autoloaders = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../../../vendor/autoload.php',
    __DIR__ . '/../../../vendor/autoload.php',
];
foreach ($autoloaders as $autoloader) {
    if (file_exists($autoloader)) {
        require_once $autoloader;
        break;
    }
}

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $path = __DIR__ . '/../src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (file_exists($path)) {
        require_once $path;
    }
}, true, true);

use App\Core\Database;
use App\Core\Env;
use App\Repositories\MaintenanceRepository;
use Dotenv\Dotenv;

Dotenv::createImmutable(__DIR__ . '/../')->load();
$retentionDays = filter_var(Env::required('GUEST_RETENTION_DAYS'), FILTER_VALIDATE_INT);
if ($retentionDays === false || $retentionDays < 1) {
    throw new RuntimeException('GUEST_RETENTION_DAYS must be a positive integer.');
}

$repository = new MaintenanceRepository(Database::getConnection());
$keys = $repository->deleteExpiredIdempotencyKeys();
$guests = $repository->deleteStaleGuests($retentionDays);
$rateLimits = $repository->deleteStaleRateLimits();
fwrite(
    STDOUT,
    "Deleted {$keys} expired idempotency keys, {$guests} stale guests, and {$rateLimits} rate-limit buckets.\n"
);
