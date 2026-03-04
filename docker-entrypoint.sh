#!/bin/sh
set -e

echo "=== Docker Entrypoint ==="
echo "Starting database migration..."

# 运行迁移脚本，带重试（等待数据库就绪）
MAX_RETRIES=10
RETRY_DELAY=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo "Migration attempt $ATTEMPT/$MAX_RETRIES..."
  if node dist/models/migrations/migrate.js up 2>&1; then
    echo "Migration completed successfully."
    break
  else
    echo "Migration failed (attempt $ATTEMPT/$MAX_RETRIES)."
    if [ $ATTEMPT -eq $MAX_RETRIES ]; then
      echo "ERROR: Migration failed after $MAX_RETRIES attempts. Starting app anyway..."
      break
    fi
    echo "Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    ATTEMPT=$((ATTEMPT + 1))
  fi
done

echo "Starting application..."
exec node dist/index.js
