# Dockerfile para Railway - Next.js App Router (apps/meli)
# Version: 3.0 - Force rebuild
FROM node:20-alpine AS base

# Instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar package.json de meli
COPY apps/meli/package.json ./package.json
COPY apps/meli/package-lock.json ./package-lock.json
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app

# Copiar node_modules y código fuente de meli
COPY --from=deps /app/node_modules ./node_modules
COPY apps/meli .

# Construir la aplicación
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crear carpeta public si no existe
RUN mkdir -p public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public 2>/dev/null || true

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
