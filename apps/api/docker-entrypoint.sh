#!/bin/sh
set -e

cd /app/apps/api

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

retry_count=${MIGRATE_RETRY_COUNT:-5}
retry_delay=${MIGRATE_RETRY_DELAY_SECONDS:-3}
migrate_mode=${PRISMA_MIGRATE_MODE:-auto}

if [ "$migrate_mode" = "auto" ]; then
  if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    migrate_mode="deploy"
  else
    migrate_mode="push"
  fi
fi

if [ "$migrate_mode" = "deploy" ]; then
  migrate_cmd="pnpm prisma:migrate:deploy"
elif [ "$migrate_mode" = "push" ]; then
  migrate_cmd="pnpm prisma db push --skip-generate"
else
  echo "Invalid PRISMA_MIGRATE_MODE: $migrate_mode (use auto, deploy, or push)"
  exit 1
fi

i=1
while [ "$i" -le "$retry_count" ]; do
  if sh -c "$migrate_cmd"; then
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
