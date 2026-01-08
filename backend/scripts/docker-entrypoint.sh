set -e

echo "🚀 Iniciando backend..."

# Extraer información de conexión de DATABASE_URL
# Formato: postgresql://usuario:contraseña@host:puerto/database
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Si no se puede extraer, usar valores por defecto
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-cinnamon}
DB_NAME=${DB_NAME:-cinnamon}

echo "📍 Conectando a: $DB_HOST:$DB_PORT/$DB_NAME"

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté disponible..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; do
  echo "   PostgreSQL no está listo aún, esperando..."
  sleep 2
done

echo "✅ PostgreSQL está listo"

# Ejecutar migraciones
echo "📦 Ejecutando migraciones de Prisma..."
# Asegurar que DATABASE_URL esté disponible para Prisma
export DATABASE_URL="${DATABASE_URL:-postgresql://cinnamon:cinnamon_dev_password@postgres:5432/cinnamon}"
# Usar DATABASE_URL directamente para prisma migrate deploy
# ya que prisma.config.ts no es reconocido por migrate deploy
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ $? -eq 0 ]; then
  echo "✅ Migraciones completadas"
else
  echo "⚠️  Advertencia: Error al ejecutar migraciones (puede ser normal si ya están aplicadas)"
fi

# Iniciar el servidor
echo "🎯 Iniciando servidor..."
exec node dist/server.js

