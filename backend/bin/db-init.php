<?php

declare(strict_types=1);

$autoloader = null;
$searchPaths = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../../../vendor/autoload.php',
    __DIR__ . '/../../../vendor/autoload.php',
];

foreach ($searchPaths as $path) {
    if (file_exists($path)) {
        $autoloader = $path;
        break;
    }
}

if ($autoloader === null) {
    fwrite(STDERR, "Autoloader not found. Run composer install before initializing the database.\n");
    exit(1);
}

require_once $autoloader;

spl_autoload_register(function (string $class): void {
    if (strpos($class, 'App\\') !== 0) {
        return;
    }

    $path = __DIR__ . '/../src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (file_exists($path)) {
        require_once $path;
    }
}, true, true);

use App\Core\Database;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$schemaPath = __DIR__ . '/../database/schema.sql';
$schema = file_get_contents($schemaPath);
if (!is_string($schema)) {
    fwrite(STDERR, "Unable to read schema file at {$schemaPath}\n");
    exit(1);
}

$db = Database::getConnection();
foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
    $db->exec($statement);
}

echo "Quiet Recall database schema initialized.\n";
