<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\AuthUser;
use App\Repositories\RecallRepository;
use App\Services\RecallStateService;

final class CompleteSessionAction
{
    public function __construct(
        private readonly RecallRepository $repository,
        private readonly RecallStateService $stateService
    ) {
    }

    public function execute(AuthUser $user, array $body): array
    {
        $session = is_array($body['session'] ?? null) ? $body['session'] : [];
        $state = $this->stateService->completeSession(
            $this->repository->loadOrCreateState($user),
            $session
        );

        return $this->repository->saveState($user, $state);
    }
}
