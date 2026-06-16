<?php

declare(strict_types=1);

namespace App\Models;

final class AuthUser
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $email,
        public readonly ?string $username,
        public readonly ?string $displayName,
        public readonly array $roles = [],
        public readonly bool $isGuest = false,
        public readonly string $authType = 'frontpage'
    ) {
    }

    public static function fromArray(array $user): self
    {
        return new self(
            (string) $user['id'],
            isset($user['email']) ? (string) $user['email'] : null,
            isset($user['username']) ? (string) $user['username'] : null,
            isset($user['display_name']) ? (string) $user['display_name'] : null,
            is_array($user['roles'] ?? null) ? $user['roles'] : [],
            (bool) ($user['is_guest'] ?? false),
            isset($user['auth_type']) ? (string) $user['auth_type'] : 'frontpage'
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'username' => $this->username,
            'display_name' => $this->displayName,
            'roles' => $this->roles,
            'is_guest' => $this->isGuest,
            'auth_type' => $this->authType,
        ];
    }
}
