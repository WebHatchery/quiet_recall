<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    private array $body;
    private array $headers;
    private array $attributes = [];

    public function __construct(
        private readonly array $routeParams = []
    ) {
        $this->body = $this->parseBody();
        $this->headers = $this->readHeaders();
    }

    public function all(): array
    {
        return $this->body;
    }

    public function getBody(): array
    {
        return $this->body;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public function param(string $key, mixed $default = null): mixed
    {
        return $this->routeParams[$key] ?? $default;
    }

    public function getHeader(string $key): ?string
    {
        return $this->headers[strtolower($key)] ?? null;
    }

    public function setAttribute(string $key, mixed $value): void
    {
        $this->attributes[$key] = $value;
    }

    public function getAttribute(string $key, mixed $default = null): mixed
    {
        return $this->attributes[$key] ?? $default;
    }

    private function parseBody(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains((string) $contentType, 'application/json')) {
            $body = file_get_contents('php://input');
            $decoded = json_decode($body ?: '[]', true);

            return is_array($decoded) ? $decoded : [];
        }

        return $_POST;
    }

    private function readHeaders(): array
    {
        $headers = [];

        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                $headers[strtolower($name)] = $value;
            }
        }

        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = $value;
            } elseif ($key === 'CONTENT_TYPE') {
                $headers['content-type'] = $value;
            } elseif ($key === 'REDIRECT_HTTP_AUTHORIZATION') {
                $headers['authorization'] = $value;
            }
        }

        return $headers;
    }
}
