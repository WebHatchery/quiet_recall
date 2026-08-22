<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use Firebase\JWT\JWT;

final class AuthController
{
    public function loginInfo(Request $request, Response $response): void
    {
        $response->success([
            'login_url' => Env::required('WEBHATCHERY_LOGIN_URL'),
        ]);
    }

    public function guestSession(Request $request, Response $response): void
    {
        $guestId = 'guest_' . bin2hex(random_bytes(16));
        $username = 'Guest ' . strtoupper(substr($guestId, -6));
        $issuedAt = time();
        $ttl = filter_var(Env::required('GUEST_SESSION_TTL_SECONDS'), FILTER_VALIDATE_INT);
        if ($ttl === false || $ttl < 300) {
            throw new \RuntimeException('GUEST_SESSION_TTL_SECONDS must be at least 300.');
        }
        $payload = [
            'sub' => $guestId,
            'user_id' => $guestId,
            'username' => $username,
            'display_name' => $username,
            'role' => 'guest',
            'roles' => ['guest'],
            'auth_type' => 'guest',
            'is_guest' => true,
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];

        $response->success([
            'token' => JWT::encode($payload, Env::required('JWT_SECRET'), 'HS256'),
            'user' => [
                'id' => $guestId,
                'username' => $username,
                'display_name' => $username,
                'roles' => ['guest'],
                'is_guest' => true,
                'auth_type' => 'guest',
            ],
        ]);
    }
}
