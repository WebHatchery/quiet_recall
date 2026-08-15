<?php

declare(strict_types=1);

namespace App\Core;

use App\Actions\CompleteReadingAction;
use App\Actions\CompleteSessionAction;
use App\Actions\LinkGuestAccountAction;
use App\Actions\LoadRecallStateAction;
use App\Actions\ReviewCardAction;
use App\Actions\SaveRecallStateAction;
use App\Actions\SaveSentenceAction;
use App\Actions\StartSessionAction;
use App\Controllers\AuthController;
use App\Controllers\HealthController;
use App\Controllers\GuestLinkController;
use App\Controllers\RecallController;
use App\Repositories\RecallRepository;
use App\Services\RecallStateService;
use PDO;
use RuntimeException;

final class ServiceFactory
{
    private ?PDO $db = null;
    private ?RecallStateService $recallStateService = null;
    private ?RecallRepository $recallRepository = null;

    public function create(string $className): object
    {
        return match ($className) {
            HealthController::class => new HealthController(),
            AuthController::class => new AuthController(),
            GuestLinkController::class => new GuestLinkController(
                new LinkGuestAccountAction($this->recallRepository())
            ),
            RecallController::class => new RecallController(
                new LoadRecallStateAction($this->recallRepository()),
                new SaveRecallStateAction($this->recallRepository()),
                new StartSessionAction($this->recallRepository(), $this->recallStateService()),
                new ReviewCardAction($this->recallRepository(), $this->recallStateService()),
                new CompleteReadingAction($this->recallRepository(), $this->recallStateService()),
                new SaveSentenceAction($this->recallRepository(), $this->recallStateService()),
                new CompleteSessionAction($this->recallRepository(), $this->recallStateService())
            ),
            default => throw new RuntimeException('Unknown class ' . $className),
        };
    }

    private function recallRepository(): RecallRepository
    {
        if ($this->recallRepository instanceof RecallRepository) {
            return $this->recallRepository;
        }

        $this->recallRepository = new RecallRepository($this->db(), $this->recallStateService());
        return $this->recallRepository;
    }

    private function recallStateService(): RecallStateService
    {
        if ($this->recallStateService instanceof RecallStateService) {
            return $this->recallStateService;
        }

        $this->recallStateService = new RecallStateService();
        return $this->recallStateService;
    }

    private function db(): PDO
    {
        if ($this->db instanceof PDO) {
            return $this->db;
        }

        $this->db = Database::getConnection();
        return $this->db;
    }
}
