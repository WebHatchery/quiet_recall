<?php

declare(strict_types=1);

$autoloader = null;
$autoloaders = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../../../vendor/autoload.php',
    __DIR__ . '/../../../vendor/autoload.php',
];
foreach ($autoloaders as $path) {
    if (file_exists($path)) {
        $autoloader = $path;
        break;
    }
}
if ($autoloader === null) {
    fwrite(STDERR, "Autoloader not found. Run composer install before migrating the database.\n");
    exit(1);
}
require_once $autoloader;

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
use App\Repositories\MigrationRepository;
use Dotenv\Dotenv;

Dotenv::createImmutable(__DIR__ . '/../')->load();
$repository = new MigrationRepository(Database::getConnection());
$applied = $repository->migrateDirectory(__DIR__ . '/../migrations');
fwrite(
    STDOUT,
    $applied === []
        ? "Quiet Recall database is current.\n"
        : 'Applied migrations: ' . implode(', ', $applied) . "\n"
);
