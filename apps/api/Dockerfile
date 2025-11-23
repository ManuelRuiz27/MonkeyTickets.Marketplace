# ============================================
# STAGE 1: Build de dependencias
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración de workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/config/package.json ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# ============================================
# STAGE 2: Builder - Compilar aplicación
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar node_modules del stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copiar código fuente completo
COPY . .

# Generar tipos desde OpenAPI
WORKDIR /app/packages/contracts
RUN pnpm run generate

# Compilar paquetes compartidos
WORKDIR /app/packages/config
RUN pnpm run build

WORKDIR /app/packages/contracts
RUN pnpm run build

# Generar Prisma Client
WORKDIR /app/apps/api
RUN pnpm run prisma:generate

# Compilar backend
RUN pnpm run build

# ============================================
# STAGE 3: Runner - Imagen de producción
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar solo dependencias de producción necesarias
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copiar node_modules y archivos compilados
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/

USER nestjs

EXPOSE 3000

WORKDIR /app/apps/api

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
