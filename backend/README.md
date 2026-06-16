# Quiet Recall Backend

PHP API for the Quiet Recall bedtime language-learning portal.

## Included

- WebHatchery bearer-token middleware
- guest session and guest merge endpoints
- persisted recall state backed by MySQL
- SRS review, reading, sentence, and session endpoints

## Commands

```powershell
composer install
composer db:init
composer start
composer test
```

Run `composer db:init` after creating the configured database. The schema is also available at
`database/schema.sql` and `migrations/001_create_quiet_recall_tables.sql`.
