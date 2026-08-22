CREATE TABLE IF NOT EXISTS quiet_recall_idempotency_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    auth_user_id VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    operation VARCHAR(80) NOT NULL,
    response_json JSON NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    UNIQUE KEY uq_quiet_recall_idempotency_user_key (auth_user_id, idempotency_key),
    INDEX idx_quiet_recall_idempotency_expiry (expires_at),
    CONSTRAINT fk_quiet_recall_idempotency_player
        FOREIGN KEY (auth_user_id)
        REFERENCES quiet_recall_players (auth_user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiet_recall_rate_limits (
    identifier_hash CHAR(64) PRIMARY KEY,
    window_started_at DATETIME NOT NULL,
    request_count INT UNSIGNED NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_quiet_recall_rate_limits_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
