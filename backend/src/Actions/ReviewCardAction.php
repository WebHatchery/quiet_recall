<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\AuthUser;
use App\Repositories\RecallRepository;
use App\Services\RecallStateService;
use DomainException;

final class ReviewCardAction
{
    public function __construct(
        private readonly RecallRepository $repository,
        private readonly RecallStateService $stateService
    ) {
    }

    public function execute(AuthUser $user, array $body): array
    {
        $cardId = $body['card_id'] ?? null;
        $rating = $body['rating'] ?? null;
        if (!is_string($cardId) || !is_string($rating)) {
            throw new DomainException('Card id and rating are required.');
        }

        $result = $this->stateService->reviewCard(
            $this->repository->loadOrCreateState($user),
            $cardId,
            $rating
        );
        $state = $this->repository->saveState($user, $result['state']);

        return [
            'state' => $state,
            'card' => $result['card'],
        ];
    }
}
