#!/bin/sh
set -e

echo "🚀 Running production database migrations..."
npx prisma migrate deploy

echo "🚀 Starting Next.js application..."
exec "$@"
