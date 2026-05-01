# Database Runbook

## Backup

Run from a host with `pg_dump` and database network access:

```bash
DATABASE_URL="postgresql://ttm:ttm@127.0.0.1:5432/ttm" \
BACKUP_DIR="./backups" \
ops/backup.sh
```

To upload automatically, set `BACKUP_BUCKET` to a `gs://` or `s3://` bucket path. The script writes
`ttm-<utc timestamp>.sql.gz` locally first, then uploads it.

## Restore

1. Create a clean database.
2. Restore the dump:

```bash
gunzip -c backups/ttm-YYYYMMDDTHHMMSSZ.sql.gz | psql "$DATABASE_URL"
```

3. Run migrations to ensure the schema is current:

```bash
cd services/api
DATABASE_URL="$DATABASE_URL" alembic upgrade head
```

4. Start the API and verify:

```bash
curl -fsS http://127.0.0.1:8010/health
curl -fsS http://127.0.0.1:8010/ready
```

## Monthly Restore Test

Once per month, restore the newest backup into a disposable database and run:

```bash
cd services/api
DATABASE_URL="$RESTORE_TEST_DATABASE_URL" alembic upgrade head
DATABASE_URL="$RESTORE_TEST_DATABASE_URL" pytest tests/test_database.py -q
```

Record the backup filename, restore database name, migration result, and test result in the
operations log. Delete the disposable database after the test.
