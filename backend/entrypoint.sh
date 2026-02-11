#!/bin/sh
echo "Waiting for database..."
retries=10
while [ $retries -gt 0 ]; do
  python -c "
import psycopg2, os
psycopg2.connect(os.environ['DATABASE_URL'])
" 2>/dev/null && break
  retries=$((retries - 1))
  echo "  DB not ready, retrying in 3s... ($retries left)"
  sleep 3
done

if [ $retries -eq 0 ]; then
  echo "ERROR: Could not connect to database"
  exit 1
fi

echo "Database is ready. Running migrations..."
flask db upgrade

echo "Starting app..."
exec python app.py
