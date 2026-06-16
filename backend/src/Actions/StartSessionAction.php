<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\AuthUser;
use App\Repositories\RecallRepository;
use App\Services\RecallStateService;

final class StartSessionAction
{
    public function __construct(
        private readonly RecallRepository $repository,
        private readonly RecallStateService $stateService
    ) {
    }

    public function execute(AuthUser $user, array $body): array
    {
        $state = $this->repository->loadOrCreateState($user);
        $session = $this->stateService->startSession(
            $state,
            (int) ($body['minutes'] ?? 5),
            (bool) ($body['tired_mode'] ?? false),
            (int) ($body['new_card_limit'] ?? 2)
        );

        return [
            'state' => $state,
            'session' => $session,
        ];
    }
}
