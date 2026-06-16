<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Actions\CompleteReadingAction;
use App\Actions\CompleteSessionAction;
use App\Actions\LoadRecallStateAction;
use App\Actions\ReviewCardAction;
use App\Actions\SaveRecallStateAction;
use App\Actions\SaveSentenceAction;
use App\Actions\StartSessionAction;
use App\Core\Request;
use App\Core\Response;
use App\Models\AuthUser;

final class RecallController
{
    public function __construct(
        private readonly LoadRecallStateAction $loadStateAction,
        private readonly SaveRecallStateAction $saveStateAction,
        private readonly StartSessionAction $startSessionAction,
        private readonly ReviewCardAction $reviewCardAction,
        private readonly CompleteReadingAction $completeReadingAction,
        private readonly SaveSentenceAction $saveSentenceAction,
        private readonly CompleteSessionAction $completeSessionAction
    ) {
    }

    public function state(Request $request, Response $response): void
    {
        $response->success($this->loadStateAction->execute($this->user($request)));
    }

    public function saveState(Request $request, Response $response): void
    {
        $response->success($this->saveStateAction->execute(
            $this->user($request),
            $request->getBody()
        ));
    }

    public function startSession(Request $request, Response $response): void
    {
        $response->success($this->startSessionAction->execute(
            $this->user($request),
            $request->getBody()
        ));
    }

    public function reviewCard(Request $request, Response $response): void
    {
        $response->success($this->reviewCardAction->execute(
            $this->user($request),
            $request->getBody()
        ));
    }

    public function completeReading(Request $request, Response $response): void
    {
        $response->success($this->completeReadingAction->execute(
            $this->user($request),
            $request->getBody()
        ));
    }

    public function saveSentence(Request $request, Response $response): void
    {
        $response->success($this->saveSentenceAction->execute(
            $this->user($request),
            $request->getBody()
        ));
    }

    public function completeSession(Request $request, Response $response): void
    {
        $response->success($this->completeSessionAction->execute(
            $this->user($request),
            $request->getBody()
        ));
    }

    private function user(Request $request): AuthUser
    {
        return AuthUser::fromArray($request->getAttribute('auth_user', []));
    }
}
