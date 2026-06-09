#!/bin/sh
set -e

echo "🚀 Iniciando backend (dev)..."

DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-cinnamon}
DB_NAME=${DB_NAME:-cinnamon}

echo "📍 Conectando a: $DB_HOST:$DB_PORT/$DB_NAME"

echo "⏳ Esperando a que PostgreSQL esté disponible..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; do
  echo "   PostgreSQL no está listo aún, esperando..."
  sleep 2
done

echo "✅ PostgreSQL está listo"

export DATABASE_URL="${DATABASE_URL:-postgresql://cinnamon:cinnamon_dev_password@postgres:5432/cinnamon}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "📦 Ejecutando migraciones de Prisma..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "⚠️  Migraciones: ya aplicadas o error ignorable"
fi

echo "🔧 Regenerando cliente de Prisma..."
npx prisma generate --schema=./prisma/schema.prisma > /dev/null 2>&1 || echo "⚠️  prisma generate falló"

echo "🎯 Iniciando servidor en modo dev (hot reload)..."
exec npx ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/server.ts
