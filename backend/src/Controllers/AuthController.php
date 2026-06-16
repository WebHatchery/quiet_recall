<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Actions\LinkGuestAccountAction;
use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use App\Models\AuthUser;
use Firebase\JWT\JWT;

final class AuthController
{
    public function __construct(private readonly LinkGuestAccountAction $linkGuestAccountAction)
    {
    }

    public function loginInfo(Request $request, Response $response): void
    {
        $response->success([
            'login_url' => Env::required('WEB_HATCHERY_LOGIN_URL'),
        ]);
    }

    public function guestSession(Request $request, Response $response): void
    {
        $guestId = 'guest_' . bin2hex(random_bytes(16));
        $username = 'Guest ' . strtoupper(substr($guestId, -6));
        $issuedAt = time();
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

    public function linkGuest(Request $request, Response $response): void
    {
        $response->success($this->linkGuestAccountAction->execute(
            AuthUser::fromArray($request->getAttribute('auth_user', [])),
            $request->getBody()
        ));
    }
}
