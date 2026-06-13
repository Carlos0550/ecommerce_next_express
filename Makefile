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

down: ## Detener el stack (conserva volúmenes)
	@echo "🛑 Deteniendo stack..."
	$(COMPOSE) down

stop: ## Detener servicios sin removerlos
	$(COMPOSE) stop

restart: ## Reiniciar todos los servicios
	$(COMPOSE) restart

logs: ## Ver logs de todos los servicios
	$(COMPOSE) logs -f --tail=100

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
