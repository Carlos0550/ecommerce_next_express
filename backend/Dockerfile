FROM node:20-alpine AS deps
WORKDIR /app

ARG DIRECT_URL=postgresql://cinnamon:cinnamon_dev_password@postgres:5432/cinnamon
ENV DIRECT_URL=$DIRECT_URL

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps --ignore-scripts && npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/prisma ./prisma

COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache postgresql-client tini && \
    addgroup -S app -g 1001 && \
    adduser -S app -u 1001 -G app

COPY --from=builder --chown=app:app /app/package*.json ./
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/scripts/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/uploads /app/uploads/storage /app/logs && \
    chown -R app:app /app && \
    chmod +x ./docker-entrypoint.sh

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./docker-entrypoint.sh"]
