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

    public function execute(AuthUser $user, array $body, string $idempotencyKey): array
    {
        $session = is_array($body['session'] ?? null) ? $body['session'] : [];
        return $this->repository->applyIntent(
            $user,
            $idempotencyKey,
            'complete_session',
            fn (array $state): array => [
                'state' => $this->stateService->completeSession($state, $session),
            ]
        );
    }
}
