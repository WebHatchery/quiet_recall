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

    public function execute(AuthUser $user, array $state): array
    {
        return $this->repository->saveState($user, $state);
    }
}
