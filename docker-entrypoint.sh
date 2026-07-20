#!/bin/sh
set -e

echo "🚀 Running production database migrations..."
if [ -f "./node_modules/prisma/build/index.js" ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
else
  npx prisma migrate deploy
fi

echo "🚀 Starting Next.js application..."
exec "$@"
