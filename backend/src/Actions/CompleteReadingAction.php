<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\AuthUser;
use App\Repositories\RecallRepository;
use App\Services\RecallStateService;
use DomainException;

final class CompleteReadingAction
{
    public function __construct(
        private readonly RecallRepository $repository,
        private readonly RecallStateService $stateService
    ) {
    }

    public function execute(AuthUser $user, array $body): array
    {
        $readingId = $body['reading_id'] ?? null;
        if (!is_string($readingId)) {
            throw new DomainException('Reading id is required.');
        }

        $result = $this->stateService->completeReading(
            $this->repository->loadOrCreateState($user),
            $readingId
        );
        $state = $this->repository->saveState($user, $result['state']);

        return [
            'state' => $state,
            'reading' => $result['reading'],
        ];
    }
}
