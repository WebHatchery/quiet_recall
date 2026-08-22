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
    header('HTTP/1.1 500 Internal Server Error');
    echo "Autoloader not found. Run composer install before starting the backend.";
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

use App\Core\Env;
use App\Core\Router;
use App\Core\Response;
use Dotenv\Dotenv;

try {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->load();
} catch (\Throwable $exception) {
}

try {
    $allowedOrigin = Env::required('CORS_ORIGIN');
} catch (\Throwable $exception) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    error_log('Quiet Recall configuration error: ' . $exception->getMessage());
    echo json_encode(['success' => false, 'message' => 'An unexpected server error occurred.']);
    exit(1);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header(
        'Access-Control-Allow-Headers: X-Requested-With, Content-Type, Accept, Origin, ' .
        'Authorization, Idempotency-Key'
    );
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Max-Age: 86400');
    exit(0);
}

header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Vary: Origin');

$router = new Router();
$router->setBasePath(Env::required('API_BASE_PATH'));

$routes = require __DIR__ . '/../src/Routes/router.php';
$routes($router);

try {
    $router->handle();
} catch (\Throwable $exception) {
    error_log('Quiet Recall unhandled exception: ' . $exception->getMessage());
    (new Response())->error('An unexpected server error occurred.', 500);
}
