<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

final class Env
{
    public static function required(string $name, bool $allowEmpty = false): string
    {
        $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);
        $value = is_string($value) ? $value : '';

        if (!$allowEmpty && trim($value) === '') {
            throw new RuntimeException("{$name} environment variable is required.");
        }

        return $value;
    }
}
