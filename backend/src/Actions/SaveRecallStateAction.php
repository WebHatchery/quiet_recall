<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\AuthUser;
use App\Repositories\RecallRepository;

final class SaveRecallStateAction
{
    public function __construct(private readonly RecallRepository $repository)
    {
    }

    public function execute(AuthUser $user, array $body): array
    {
        $state = is_array($body['state'] ?? null) ? $body['state'] : [];
        $revision = filter_var($body['expected_revision'] ?? null, FILTER_VALIDATE_INT);
        if ($state === [] || $revision === false || $revision < 1) {
            throw new \DomainException('State and expected_revision are required for legacy import.');
        }
        return $this->repository->importState($user, $state, $revision);
    }
}
