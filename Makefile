.PHONY: help up up-build down logs logs-backend logs-frontend logs-db logs-redis logs-minio ps restart build clean clean-all migrate migrate-create seed shell-backend shell-frontend shell-db shell-redis shell-minio minio-ls stop

COMPOSE := docker compose --env-file docker-compose.env

help: ## Mostrar esta ayuda
	@echo "Cinnamon - comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

up: ## Levantar el stack de desarrollo (con hot reload)
	@echo "🚀 Levantando stack de desarrollo..."
	NODE_ENV=development \
	BACKEND_DOCKERFILE=Dockerfile.dev \
	FRONTEND_DOCKERFILE=Dockerfile.dev \
		$(COMPOSE) up -d
	@echo ""
	@echo "✅ Stack levantado. URLs:"
	@echo "   Frontend: http://localhost:3001"
	@echo "   Backend:  http://localhost:3000"
	@echo "   Postgres: localhost:5433"
	@echo "   Redis:    localhost:6380"
	@echo "   MinIO:    http://localhost:9002 (consola 9003)"
	@echo ""
	@echo "   Ejecuta 'make logs' para ver los logs en vivo"

up-build: ## Levantar el stack reconstruyendo imágenes
	@echo "🔨 Levantando stack (rebuild)..."
	NODE_ENV=development \
	BACKEND_DOCKERFILE=Dockerfile.dev \
	FRONTEND_DOCKERFILE=Dockerfile.dev \
		$(COMPOSE) up -d --build

build: ## Construir imágenes de producción
	@echo "🔨 Construyendo imágenes de producción..."
	NODE_ENV=production $(COMPOSE) build

down: ## Detener el stack (conserva volúmenes)
	@echo "🛑 Deteniendo stack..."
	$(COMPOSE) down

stop: ## Detener servicios sin removerlos
	$(COMPOSE) stop

restart: ## Reiniciar todos los servicios
	$(COMPOSE) restart

ps: ## Ver estado de los servicios
	$(COMPOSE) ps

logs: ## Ver logs de todos los servicios
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Ver logs del backend
	$(COMPOSE) logs -f --tail=100 backend

logs-frontend: ## Ver logs del frontend
	$(COMPOSE) logs -f --tail=100 frontend

logs-db: ## Ver logs de postgres
	$(COMPOSE) logs -f --tail=100 postgres

logs-redis: ## Ver logs de redis
	$(COMPOSE) logs -f --tail=100 redis

logs-minio: ## Ver logs de minio
	$(COMPOSE) logs -f --tail=100 minio

migrate: ## Ejecutar migraciones de Prisma (deploy) en el backend local
	@echo "📦 Ejecutando migraciones de Prisma..."
	cd backend && npx prisma migrate deploy

migrate-create: ## Crear nueva migración (uso: make migrate-create NAME=migration_name)
	@if [ -z "$(NAME)" ]; then \
		echo "❌ Debes pasar un nombre: make migrate-create NAME=mi_migracion"; \
		exit 1; \
	fi
	cd backend && npx prisma migrate dev --name $(NAME)

migrate-reset: ## Resetear la base de datos (⚠️ borra todos los datos)
	@echo "⚠️  Esto borrará todos los datos. Presiona Ctrl-C para abortar en 5s..."
	@sleep 5
	cd backend && npx prisma migrate reset --force

migrate-status: ## Ver estado de las migraciones
	cd backend && npx prisma migrate status

prisma-generate: ## Regenerar cliente de Prisma
	cd backend && npx prisma generate

seed: ## Ejecutar todos los seeds
	@echo "🌱 Ejecutando seeds..."
	cd backend && npm run seed:users
	cd backend && npm run seed:products
	cd backend && npm run seed:sales
	cd backend && npm run seed:promos

shell-backend: ## Abrir shell en el contenedor del backend
	$(COMPOSE) exec backend sh

shell-frontend: ## Abrir shell en el contenedor del frontend
	$(COMPOSE) exec frontend sh

shell-db: ## Abrir psql en postgres
	$(COMPOSE) exec postgres psql -U cinnamon -d cinnamon

shell-redis: ## Abrir redis-cli
	$(COMPOSE) exec redis redis-cli

shell-minio: ## Abrir shell en minio
	$(COMPOSE) exec minio sh

minio-ls: ## Listar objetos del bucket en minio
	$(COMPOSE) run --rm minio-init \
		/bin/sh -c "mc alias set local http://minio:9000 $$MINIO_ROOT_USER $$MINIO_ROOT_PASSWORD && mc ls local/$${MINIO_BUCKET:-images}"

clean: ## Detener y remover contenedores y red (conserva volúmenes)
	@echo "🧹 Limpiando contenedores y red..."
	$(COMPOSE) down --remove-orphans
	@echo "✅ Contenedores y red eliminados (volúmenes conservados)"

clean-all: ## ⚠️  Limpiar TODO: contenedores, redes, imágenes y volúmenes
	@echo "⚠️  Esto eliminará también los volúmenes (datos de DB, redis, minio y uploads)."
	@echo "   Presiona Ctrl-C para abortar en 5s..."
	@sleep 5
	@echo "🧹 Limpiando todo..."
	$(COMPOSE) down --remove-orphans --volumes
	docker rmi -f $(shell docker images -q --filter "reference=*cinnamon*" 2>/dev/null) 2>/dev/null || true
	@echo "✅ Limpieza completa"
