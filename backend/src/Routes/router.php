<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\HealthController;
use App\Controllers\GuestLinkController;
use App\Controllers\RecallController;
use App\Core\Router;
use App\Middleware\WebHatcheryJwtMiddleware;
use App\Middleware\RateLimitMiddleware;

return static function (Router $router): void {
    $protected = [WebHatcheryJwtMiddleware::class, RateLimitMiddleware::class];
    $rateLimited = [RateLimitMiddleware::class];

    $router->get('/health', [HealthController::class, 'check']);
    $router->get('/auth/login-info', [AuthController::class, 'loginInfo'], $rateLimited);
    $router->post('/auth/guest-session', [AuthController::class, 'guestSession'], $rateLimited);
    $router->post('/auth/link-guest', [GuestLinkController::class, 'link'], $protected);

    $router->get('/study/state', [RecallController::class, 'state'], $protected);
    $router->put('/study/state', [RecallController::class, 'saveState'], $protected);
    $router->post('/study/session/start', [RecallController::class, 'startSession'], $protected);
    $router->post('/study/card/review', [RecallController::class, 'reviewCard'], $protected);
    $router->post('/study/reading/complete', [RecallController::class, 'completeReading'], $protected);
    $router->post('/study/sentence', [RecallController::class, 'saveSentence'], $protected);
    $router->post('/study/session/complete', [RecallController::class, 'completeSession'], $protected);
};
