<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;

final class WebHatcheryJwtMiddleware
{
    public function __invoke(Request $request, Response $response): Request|Response
    {
        $authHeader = $request->getHeader('authorization');
        if (!is_string($authHeader) || preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches) !== 1) {
            return $this->unauthorized($response);
        }

        try {
            $decoded = JWT::decode($matches[1], new Key(Env::required('JWT_SECRET'), 'HS256'));
            $userId = $decoded->sub ?? $decoded->user_id ?? null;
            if (!is_string($userId) || trim($userId) === '' || strlen($userId) > 128) {
                throw new RuntimeException('Token missing user identifier.');
            }
            if (!isset($decoded->iat) || !is_numeric($decoded->iat)) {
                throw new RuntimeException('Token missing issued-at claim.');
            }
            $authType = isset($decoded->auth_type) ? (string) $decoded->auth_type : 'frontpage';
            if (!in_array($authType, ['frontpage', 'guest'], true)) {
                throw new RuntimeException('Token has invalid authentication type.');
            }
            $isGuest = (bool) ($decoded->is_guest ?? false);
            if (($authType === 'guest') !== $isGuest || ($isGuest && !isset($decoded->exp))) {
                throw new RuntimeException('Token has inconsistent guest claims.');
            }

            $request->setAttribute('auth_user', [
                'id' => (string) $userId,
                'email' => isset($decoded->email) ? (string) $decoded->email : null,
                'username' => isset($decoded->username) ? (string) $decoded->username : null,
                'display_name' => isset($decoded->display_name)
                    ? (string) $decoded->display_name
                    : (isset($decoded->username) ? (string) $decoded->username : null),
                'roles' => is_array($decoded->roles ?? null) ? $decoded->roles : [],
                'is_guest' => $isGuest,
                'auth_type' => $authType,
            ]);

            return $request;
        } catch (\Throwable) {
            return $this->unauthorized($response);
        }
    }

    private function unauthorized(Response $response): Response
    {
        $response->error('Authentication required', 401, [
            'login_url' => Env::required('WEB_HATCHERY_LOGIN_URL'),
        ]);

        return $response;
    }
}
