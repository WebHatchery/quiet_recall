<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\AuthUser;
use App\Repositories\RecallRepository;
use App\Services\RecallStateService;

final class SaveSentenceAction
{
    public function __construct(
        private readonly RecallRepository $repository,
        private readonly RecallStateService $stateService
    ) {
    }

    public function execute(AuthUser $user, array $body): array
    {
        $state = $this->stateService->saveSentence(
            $this->repository->loadOrCreateState($user),
            isset($body['prompt']) ? (string) $body['prompt'] : '',
            isset($body['text']) ? (string) $body['text'] : ''
        );

        return $this->repository->saveState($user, $state);
    }
}
