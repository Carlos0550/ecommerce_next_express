# Cinnamon - Docker + Makefile

Stack completo con **Postgres**, **Redis**, **MinIO**, **Backend (Node/Express/Prisma)** y **Frontend (Next.js)**.

## Requisitos

- Docker >= 24
- Docker Compose v2
- make

## Quick start

```bash
make up                     # levanta dev con hot reload
make logs                   # ver logs
make down                   # detener
```

**No hay `.env` raíz**: cada app tiene el suyo (`backend/.env` y `front/.env`) y el compose usa `env_file` para leerlos. La configuración de la infra (puertos, credenciales de postgres/redis/minio) está en `docker-compose.env`.

Servicios disponibles (puertos por defecto en `docker-compose.env`):

| Servicio       | URL                                    |
|----------------|----------------------------------------|
| Frontend       | http://localhost:3001                  |
| Backend        | http://localhost:3000                  |
| Postgres       | localhost:5433                         |
| Redis          | localhost:6380                         |
| MinIO API      | http://localhost:9002                  |
| MinIO Console  | http://localhost:9003                  |

## Comandos

| Comando                  | Acción                                              |
|--------------------------|-----------------------------------------------------|
| `make up`                | Levanta stack de **desarrollo** (hot reload)        |
| `make up-build`          | Reconstruye imágenes y levanta en dev               |
| `make build`             | Build de imágenes de **producción**                 |
| `make down`              | Detiene y elimina contenedores (conserva volúmenes) |
| `make stop`              | Solo detiene servicios                              |
| `make restart`           | Reinicia todos los servicios                        |
| `make ps`                | Estado de los servicios                             |
| `make logs`              | Logs en vivo de todos los servicios                 |
| `make logs-backend`      | Logs solo del backend                               |
| `make logs-frontend`     | Logs solo del frontend                              |
| `make logs-db`           | Logs solo de postgres                               |
| `make logs-redis`        | Logs solo de redis                                  |
| `make logs-minio`        | Logs solo de minio                                  |
| `make shell-minio`       | Shell dentro de minio                               |
| `make minio-ls`          | Listar objetos del bucket                           |
| `make migrate`           | Aplica migraciones Prisma (`migrate deploy`)        |
| `make migrate-create`    | Crea nueva migración (`NAME=foo`)                   |
| `make migrate-reset`     | ⚠️ Resetea la base de datos (borra datos)           |
| `make migrate-status`    | Estado de migraciones                               |
| `make prisma-generate`   | Regenera el cliente Prisma                          |
| `make seed`              | Ejecuta todos los seeds                             |
| `make shell-backend`     | Shell dentro del contenedor backend                 |
| `make shell-frontend`    | Shell dentro del contenedor frontend                |
| `make shell-db`          | `psql` dentro de postgres                           |
| `make shell-redis`       | `redis-cli` dentro de redis                         |
| `make clean`             | Limpia contenedores y red (conserva volúmenes)      |
| `make clean-all`         | ⚠️ Limpia TODO: contenedores, imágenes y volúmenes  |

## Modos de ejecución

### Desarrollo (default con `make up`)

- Backend: usa `backend/Dockerfile.dev` → **ts-node-dev con hot reload**
  - Sincroniza `./backend/src` con el contenedor
  - Aplica migraciones automáticamente al arrancar
- Frontend: usa `front/Dockerfile.dev` → **Next.js dev server**
  - Sincroniza `app/`, `components/`, `lib/`, `stores/`, `public/`, `next.config.ts`
  - Usa polling para detectar cambios en archivos (CHOKIDAR/WATCHPACK)

### Producción

```bash
make build           # construye imágenes de prod
NODE_ENV=production make up
```

Las imágenes usan `Dockerfile` (multi-stage build) y sirven el JS ya compilado.

## Migraciones Prisma

Las migraciones corren **automáticamente** cuando arranca el backend (entrypoint).

Para correrlas manualmente contra el contenedor:

```bash
make migrate
```

Si querés crear una nueva migración tras modificar `schema.prisma`:

```bash
make migrate-create NAME=add_campo_x
```

## Estructura

```
.
├── Makefile
├── docker-compose.yml
├── docker-compose.env     # config de infra (puertos, credenciales postgres/redis/minio)
├── backend/
│   ├── .env               # variables de la app backend
│   ├── Dockerfile         # producción (multi-stage)
│   ├── Dockerfile.dev     # desarrollo (hot reload)
│   └── scripts/
│       ├── docker-entrypoint.sh
│       └── docker-entrypoint.dev.sh
└── front/
    ├── .env               # variables de la app frontend
    ├── Dockerfile         # producción (multi-stage)
    └── Dockerfile.dev     # desarrollo (hot reload)
```

## Volúmenes nombrados

- `postgres_data` — datos de Postgres
- `redis_data` — datos de Redis (AOF)
- `minio_data` — objetos de MinIO
- `backend_uploads` — uploads locales
- `backend_logs` — logs rotados

Para destruir todos los volúmenes: `make clean-all`.

## MinIO

Al arrancar el stack, un job `minio-init` (imagen `minio/mc`) crea automáticamente el bucket configurado en `MINIO_BUCKET` y le aplica política de **lectura anónima** (para que las imágenes sean accesibles públicamente vía `MINIO_ENDPOINT:9000/<bucket>/<objeto>`).

- **API S3**: `http://localhost:9002`
- **Consola web**: `http://localhost:9003` (login con `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` de `docker-compose.env`)
- **Credenciales de aplicación**: `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` en `backend/.env` (pueden coincidir con root o ser otras)
