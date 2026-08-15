CREATE TABLE IF NOT EXISTS quiet_recall_players (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    auth_user_id VARCHAR(128) NOT NULL,
    email VARCHAR(255) NULL,
    username VARCHAR(120) NULL,
    display_name VARCHAR(160) NULL,
    is_guest TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_quiet_recall_players_auth_user_id (auth_user_id),
    INDEX idx_quiet_recall_players_guest (is_guest)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiet_recall_saves (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    auth_user_id VARCHAR(128) NOT NULL,
    state_json JSON NOT NULL,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_quiet_recall_saves_auth_user_id (auth_user_id),
    CONSTRAINT fk_quiet_recall_saves_player
        FOREIGN KEY (auth_user_id)
        REFERENCES quiet_recall_players (auth_user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
