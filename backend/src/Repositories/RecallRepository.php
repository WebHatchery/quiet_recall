<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\AuthUser;
use App\Services\RecallStateService;
use PDO;
use RuntimeException;

final class RecallRepository
{
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
             )
             VALUES (:auth_user_id, :email, :username, :display_name, :is_guest, :created_at, :updated_at)
             ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                username = VALUES(username),
                display_name = VALUES(display_name),
                is_guest = VALUES(is_guest),
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

    public function loadOrCreateState(AuthUser $user): array
    {
        $this->upsertPlayer($user);
        $save = $this->findSaveByUserId($user->id);
        if ($save !== null) {
            return $save['state'];
        }

        return $this->saveState($user, $this->stateService->defaultState());
    }

    public function saveState(AuthUser $user, array $state): array
    {
        $this->upsertPlayer($user);
        $state = $this->stateService->normalizeState($state);
        $now = $this->now();
        $statement = $this->db->prepare(
            'INSERT INTO quiet_recall_saves (auth_user_id, state_json, created_at, updated_at)
             VALUES (:auth_user_id, :state_json, :created_at, :updated_at)
             ON DUPLICATE KEY UPDATE
                state_json = VALUES(state_json),
                updated_at = VALUES(updated_at)'
        );
        $statement->execute([
            'auth_user_id' => $user->id,
            'state_json' => $this->json($state),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $state;
    }

    public function moveGuestSaveToUser(string $guestUserId, AuthUser $targetUser): array
    {
        if ($guestUserId === $targetUser->id) {
            throw new RuntimeException('Guest session is already linked to this account.');
        }

        $this->db->beginTransaction();
        try {
            $this->upsertPlayer($targetUser);
            $guestSave = $this->findSaveByUserId($guestUserId);
            if ($guestSave === null) {
                throw new RuntimeException('Guest save not found.');
            }

            $targetSave = $this->findSaveByUserId($targetUser->id);
            if ($targetSave !== null) {
                $delete = $this->db->prepare('DELETE FROM quiet_recall_saves WHERE auth_user_id = :auth_user_id');
                $delete->execute(['auth_user_id' => $targetUser->id]);
            }

            $move = $this->db->prepare(
                'UPDATE quiet_recall_saves
                 SET auth_user_id = :target_user_id,
                     updated_at = :updated_at
                 WHERE auth_user_id = :guest_user_id'
            );
            $move->execute([
                'target_user_id' => $targetUser->id,
                'guest_user_id' => $guestUserId,
                'updated_at' => $this->now(),
            ]);

            $deleteGuest = $this->db->prepare('DELETE FROM quiet_recall_players WHERE auth_user_id = :guest_user_id');
            $deleteGuest->execute(['guest_user_id' => $guestUserId]);

            $this->db->commit();
            return $guestSave['state'];
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $error;
        }
    }

    private function findSaveByUserId(string $authUserId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, auth_user_id, state_json, created_at, updated_at
             FROM quiet_recall_saves
             WHERE auth_user_id = :auth_user_id'
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
            'id' => (int) $row['id'],
            'auth_user_id' => $row['auth_user_id'],
            'state' => $this->stateService->normalizeState($decoded),
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }

    private function json(array $value): string
    {
        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function now(): string
    {
        return gmdate('Y-m-d H:i:s');
    }
}
