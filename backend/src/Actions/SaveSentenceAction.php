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

    public function execute(AuthUser $user, array $body, string $idempotencyKey): array
    {
        return $this->repository->applyIntent(
            $user,
            $idempotencyKey,
            'save_sentence',
            fn (array $state): array => [
                'state' => $this->stateService->saveSentence(
                    $state,
                    isset($body['prompt']) ? (string) $body['prompt'] : '',
                    isset($body['text']) ? (string) $body['text'] : ''
                ),
            ]
        );
    }
}
