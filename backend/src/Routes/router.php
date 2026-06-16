<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\HealthController;
use App\Controllers\RecallController;
use App\Core\Router;
use App\Middleware\WebHatcheryJwtMiddleware;

return static function (Router $router): void {
    $auth = [WebHatcheryJwtMiddleware::class];

    $router->get('/health', [HealthController::class, 'check']);
    $router->get('/auth/login-info', [AuthController::class, 'loginInfo']);
    $router->post('/auth/guest-session', [AuthController::class, 'guestSession']);
    $router->post('/auth/link-guest', [AuthController::class, 'linkGuest'], $auth);

    $router->get('/study/state', [RecallController::class, 'state'], $auth);
    $router->put('/study/state', [RecallController::class, 'saveState'], $auth);
    $router->post('/study/session/start', [RecallController::class, 'startSession'], $auth);
    $router->post('/study/card/review', [RecallController::class, 'reviewCard'], $auth);
    $router->post('/study/reading/complete', [RecallController::class, 'completeReading'], $auth);
    $router->post('/study/sentence', [RecallController::class, 'saveSentence'], $auth);
    $router->post('/study/session/complete', [RecallController::class, 'completeSession'], $auth);
};
