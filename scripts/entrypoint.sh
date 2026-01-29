#!/usr/bin/env sh
set -e

if [ -f /app/.env ]; then
  set -a
  . /app/.env
  set +a
fi

alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
