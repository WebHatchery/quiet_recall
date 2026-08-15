<?php

declare(strict_types=1);

namespace App\Core;

use DomainException;
use RuntimeException;
use Throwable;
use App\Core\ConflictException;
use PDOException;

final class Router
{
    private array $routes = [];
    private string $basePath = '';

    public function setBasePath(string $basePath): void
    {
        $this->basePath = rtrim($basePath, '/');
    }

    public function get(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function delete(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    private function addRoute(string $method, string $path, array|callable $handler, array $middleware): void
    {
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        $this->routes[] = [
            'method' => $method,
            'pattern' => '#^' . $pattern . '$#',
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function handle(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = explode('?', $uri)[0];

        if ($this->basePath !== '' && strpos($path, $this->basePath) === 0) {
            $path = substr($path, strlen($this->basePath));
        }

        if ($path === '') {
            $path = '/';
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (!preg_match($route['pattern'], $path, $matches)) {
                continue;
            }

            $routeParams = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            $response = new Response();

            try {
                $request = new Request($routeParams);
                foreach ($route['middleware'] as $middlewareClass) {
                    $middleware = new $middlewareClass();
                    $result = $middleware($request, $response);
                    if ($result instanceof Request) {
                        $request = $result;
                        continue;
                    }

                    if ($result instanceof Response) {
                        return;
                    }
                }

                if (is_callable($route['handler'])) {
                    ($route['handler'])($request, $response);
                    return;
                }

                $factory = new ServiceFactory();
                $controller = $factory->create($route['handler'][0]);
                $methodName = $route['handler'][1];
                $controller->$methodName($request, $response);
                return;
            } catch (ConflictException $exception) {
                $response->error($exception->getMessage(), 409, ['code' => 'revision_conflict']);
                return;
            } catch (DomainException $exception) {
                $response->error($exception->getMessage(), 422);
                return;
            } catch (PDOException) {
                $response->error('Study service database is unavailable.', 503);
                return;
            } catch (RuntimeException $exception) {
                $response->error($exception->getMessage(), 400);
                return;
            } catch (Throwable) {
                $response->error('Unexpected server error', 500);
                return;
            }
        }

        (new Response())->error('Route not found: ' . $path, 404);
    }
}
