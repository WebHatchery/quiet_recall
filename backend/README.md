# Quiet Recall Backend

PHP API for the Quiet Recall bedtime language-learning portal.

## Included

- WebHatchery bearer-token middleware
- guest session and guest merge endpoints
- revisioned recall state backed by MySQL
- idempotent SRS review, reading, sentence, and session intent endpoints
- explicit guest/account merge strategies
- bounded payloads, expiring guest JWTs, and fixed-window rate limits

## Commands

```powershell
composer install
composer db:init
composer start
composer test
```

`composer db:init` applies the ordered SQL files in `migrations/` and records their SHA-256
checksums in `quiet_recall_schema_migrations`. It is safe to run during every deployment;
it refuses to continue if an already-applied migration has been edited.

## Operations

- Run `php bin/cleanup.php` daily to retire stale guest accounts, expired idempotency keys,
  and old rate-limit buckets.
- Before a release, set the database environment variables in the process and run
  `./bin/backup.ps1 -OutputDirectory <absolute-backup-directory>`.
- Rehearse restoration against a disposable database with
  `./bin/restore.ps1 -BackupPath <absolute-sql-file> -ExpectedDatabase <database-name>`.
  The explicit database-name match is a guard against restoring to the wrong target.
- Production database passwords and JWT secrets must be injected by the deployment
  environment. Rotate any credential that has previously been stored in a tracked file.
