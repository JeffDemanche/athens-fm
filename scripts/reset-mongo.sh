#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-athens-fm-mongo}"
DATABASE="${MONGO_DATABASE:-athens-fm}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Mongo container '$CONTAINER' is not running."
  echo "Start the stack with: npm run dev"
  exit 1
fi

docker exec "$CONTAINER" mongosh "$DATABASE" --quiet --eval 'db.dropDatabase()'
echo "Dropped database '$DATABASE' in container '$CONTAINER'."
