#!/bin/sh
set -e

cd /app/apps/api

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

retry_count=${MIGRATE_RETRY_COUNT:-5}
retry_delay=${MIGRATE_RETRY_DELAY_SECONDS:-3}

i=1
while [ "$i" -le "$retry_count" ]; do
  if pnpm prisma:migrate:deploy; then
    break
  fi
  echo "Migration failed. Retry $i/$retry_count in ${retry_delay}s..."
  i=$((i + 1))
  sleep "$retry_delay"
done

if [ "$i" -gt "$retry_count" ]; then
  echo "Migrations failed after ${retry_count} attempts"
  exit 1
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "Running seed..."
  pnpm prisma:seed
fi

exec "$@"
