<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\ConflictException;
use App\Models\AuthUser;
use App\Services\RecallStateService;
use DomainException;
use PDO;
use RuntimeException;
use Throwable;

final class RecallRepository
{
    private const IDEMPOTENCY_TTL_SECONDS = 604800;

    public function __construct(
        private readonly PDO $db,
        private readonly RecallStateService $stateService
    ) {
    }

    public function upsertPlayer(AuthUser $user): void
    {
        $now = $this->now();
        $statement = $this->db->prepare(
            'INSERT INTO quiet_recall_players (
                auth_user_id, email, username, display_name, is_guest, created_at, updated_at
             ) VALUES (
                :auth_user_id, :email, :username, :display_name, :is_guest, :created_at, :updated_at
             ) ON DUPLICATE KEY UPDATE
                email = VALUES(email), username = VALUES(username),
                display_name = VALUES(display_name), is_guest = VALUES(is_guest),
                updated_at = VALUES(updated_at)'
        );
        $statement->execute([
            'auth_user_id' => $user->id,
            'email' => $user->email,
            'username' => $user->username,
            'display_name' => $user->displayName,
            'is_guest' => $user->isGuest ? 1 : 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function loadOrCreateDocument(AuthUser $user): array
    {
        $this->upsertPlayer($user);
        $save = $this->findSaveByUserId($user->id);
        if ($save === null) {
            $this->insertSave($user->id, $this->stateService->defaultState());
            $save = $this->findSaveByUserId($user->id);
        }

        if ($save === null) {
            throw new RuntimeException('Recall state could not be created.');
        }

        return $this->document($save['state'], $save['revision']);
    }

    public function importState(AuthUser $user, array $state, int $expectedRevision): array
    {
        $this->db->beginTransaction();
        try {
            $this->upsertPlayer($user);
            $save = $this->lockOrCreateSave($user->id);
            if ($save['revision'] !== $expectedRevision) {
                throw new ConflictException('The remote study state changed. Reload before importing local progress.');
            }

            $state = $this->stateService->normalizeState($state);
            $revision = $save['revision'] + 1;
            $this->updateSave($user->id, $state, $revision);
            $this->db->commit();
            return $this->document($state, $revision);
        } catch (Throwable $error) {
            $this->rollBack();
            throw $error;
        }
    }

    /**
     * Apply one user intent atomically to the latest save. Reusing an idempotency
     * key returns the original response and never invokes the mutation twice.
     */
    public function applyIntent(
        AuthUser $user,
        string $idempotencyKey,
        string $operation,
        callable $mutation
    ): array {
        $this->validateIdempotencyKey($idempotencyKey);
        $this->db->beginTransaction();

        try {
            $this->upsertPlayer($user);
            $cached = $this->findIdempotentResponse($user->id, $idempotencyKey, $operation);
            if ($cached !== null) {
                $this->db->commit();
                return $cached;
            }

            $save = $this->lockOrCreateSave($user->id);
            $result = $mutation($save['state']);
            if (!is_array($result) || !is_array($result['state'] ?? null)) {
                throw new RuntimeException('Intent mutation did not return recall state.');
            }

            $state = $this->stateService->normalizeState($result['state']);
            $revision = $save['revision'] + 1;
            $this->updateSave($user->id, $state, $revision);
            $response = array_merge($result, $this->document($state, $revision));
            $this->storeIdempotentResponse($user->id, $idempotencyKey, $operation, $response);
            $this->db->commit();
            return $response;
        } catch (Throwable $error) {
            $this->rollBack();
            throw $error;
        }
    }

    public function moveGuestSaveToUser(
        string $guestUserId,
        AuthUser $targetUser,
        string $strategy
    ): array {
        if ($guestUserId === $targetUser->id) {
            throw new RuntimeException('Guest session is already linked to this account.');
        }
        if (!in_array($strategy, ['merge', 'keep_guest', 'keep_account'], true)) {
            throw new DomainException('A valid guest merge strategy is required.');
        }

        $this->db->beginTransaction();
        try {
            $this->upsertPlayer($targetUser);
            $guestSave = $this->findSaveByUserId($guestUserId, true);
            if ($guestSave === null) {
                throw new RuntimeException('Guest save not found.');
            }
            $targetSave = $this->findSaveByUserId($targetUser->id, true);

            if ($targetSave === null || $strategy === 'keep_guest') {
                $state = $guestSave['state'];
            } elseif ($strategy === 'keep_account') {
                $state = $targetSave['state'];
            } else {
                $state = $this->stateService->mergeStates($targetSave['state'], $guestSave['state']);
            }

            $revision = max($guestSave['revision'], $targetSave['revision'] ?? 0) + 1;
            if ($targetSave === null) {
                $this->insertSave($targetUser->id, $state, $revision);
            } else {
                $this->updateSave($targetUser->id, $state, $revision);
            }

            $deleteGuest = $this->db->prepare(
                'DELETE FROM quiet_recall_players WHERE auth_user_id = :guest_user_id'
            );
            $deleteGuest->execute(['guest_user_id' => $guestUserId]);
            $this->db->commit();
            return $this->document($state, $revision);
        } catch (Throwable $error) {
            $this->rollBack();
            throw $error;
        }
    }

    private function lockOrCreateSave(string $authUserId): array
    {
        $save = $this->findSaveByUserId($authUserId, true);
        if ($save !== null) {
            return $save;
        }

        $this->insertSave($authUserId, $this->stateService->defaultState());
        $save = $this->findSaveByUserId($authUserId, true);
        if ($save === null) {
            throw new RuntimeException('Recall state could not be locked.');
        }
        return $save;
    }

    private function findSaveByUserId(string $authUserId, bool $forUpdate = false): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, auth_user_id, state_json, revision, created_at, updated_at
             FROM quiet_recall_saves WHERE auth_user_id = :auth_user_id' . ($forUpdate ? ' FOR UPDATE' : '')
        );
        $statement->execute(['auth_user_id' => $authUserId]);
        $row = $statement->fetch();
        if (!$row) {
            return null;
        }

        $decoded = json_decode((string) $row['state_json'], true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Stored recall state is invalid.');
        }
        return [
            'state' => $this->stateService->normalizeState($decoded),
            'revision' => (int) $row['revision'],
        ];
    }

    private function insertSave(string $authUserId, array $state, int $revision = 1): void
    {
        $now = $this->now();
        $statement = $this->db->prepare(
            'INSERT INTO quiet_recall_saves
                (auth_user_id, state_json, revision, created_at, updated_at)
             VALUES (:auth_user_id, :state_json, :revision, :created_at, :updated_at)'
        );
        $statement->execute([
            'auth_user_id' => $authUserId,
            'state_json' => $this->json($this->stateService->normalizeState($state)),
            'revision' => $revision,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function updateSave(string $authUserId, array $state, int $revision): void
    {
        $statement = $this->db->prepare(
            'UPDATE quiet_recall_saves
             SET state_json = :state_json, revision = :revision, updated_at = :updated_at
             WHERE auth_user_id = :auth_user_id'
        );
        $statement->execute([
            'state_json' => $this->json($state),
            'revision' => $revision,
            'updated_at' => $this->now(),
            'auth_user_id' => $authUserId,
        ]);
    }

    private function findIdempotentResponse(string $userId, string $key, string $operation): ?array
    {
        $statement = $this->db->prepare(
            'SELECT operation, response_json FROM quiet_recall_idempotency_keys
             WHERE auth_user_id = :auth_user_id AND idempotency_key = :idempotency_key
             FOR UPDATE'
        );
        $statement->execute(['auth_user_id' => $userId, 'idempotency_key' => $key]);
        $row = $statement->fetch();
        if (!$row) {
            return null;
        }
        if ($row['operation'] !== $operation) {
            throw new ConflictException('Idempotency key was already used for another operation.');
        }
        $response = json_decode((string) $row['response_json'], true);
        if (!is_array($response)) {
            throw new RuntimeException('Stored idempotency response is invalid.');
        }
        return $response;
    }

    private function storeIdempotentResponse(string $userId, string $key, string $operation, array $response): void
    {
        $statement = $this->db->prepare(
            'INSERT INTO quiet_recall_idempotency_keys
                (auth_user_id, idempotency_key, operation, response_json, created_at, expires_at)
             VALUES
                (:auth_user_id, :idempotency_key, :operation, :response_json, :created_at, :expires_at)'
        );
        $statement->execute([
            'auth_user_id' => $userId,
            'idempotency_key' => $key,
            'operation' => $operation,
            'response_json' => $this->json($response),
            'created_at' => $this->now(),
            'expires_at' => gmdate('Y-m-d H:i:s', time() + self::IDEMPOTENCY_TTL_SECONDS),
        ]);
    }

    private function validateIdempotencyKey(string $key): void
    {
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/', $key)) {
            throw new DomainException('A valid Idempotency-Key header is required.');
        }
    }

    private function document(array $state, int $revision): array
    {
        return ['state' => $state, 'revision' => $revision];
    }

    private function json(array $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($json)) {
            throw new RuntimeException('Recall state could not be encoded.');
        }
        return $json;
    }

    private function rollBack(): void
    {
        if ($this->db->inTransaction()) {
            $this->db->rollBack();
        }
    }

    private function now(): string
    {
        return gmdate('Y-m-d H:i:s');
    }
}
