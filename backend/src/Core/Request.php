<?php

declare(strict_types=1);

namespace App\Core;

use DomainException;
use RuntimeException;

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
        $maxBytes = filter_var(Env::required('MAX_REQUEST_BYTES'), FILTER_VALIDATE_INT);
        if ($maxBytes === false || $maxBytes < 1024) {
            throw new RuntimeException('MAX_REQUEST_BYTES must be an integer of at least 1024.');
        }
        $contentLength = filter_var($_SERVER['CONTENT_LENGTH'] ?? 0, FILTER_VALIDATE_INT);
        if ($contentLength !== false && $contentLength > $maxBytes) {
            throw new DomainException('Request payload is too large.');
        }

        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (str_contains((string) $contentType, 'application/json')) {
            $body = file_get_contents('php://input');
            if (is_string($body) && strlen($body) > $maxBytes) {
                throw new DomainException('Request payload is too large.');
            }
            $decoded = json_decode($body ?: '[]', true);
            if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
                throw new DomainException('Request body must be valid JSON.');
            }
            return $decoded;
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
