# ============================================
# STAGE 1: Build de dependencias
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/web/package.json ./apps/web/

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
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copiar código fuente
COPY . .

# Generar tipos desde OpenAPI
WORKDIR /app/packages/contracts
RUN pnpm run generate && pnpm run build

# Compilar frontend
WORKDIR /app/apps/web
# Variable de entorno para la API en build time
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_MERCADO_PAGO_PUBLIC_KEY
ENV VITE_MERCADO_PAGO_PUBLIC_KEY=$VITE_MERCADO_PAGO_PUBLIC_KEY

RUN pnpm run build

# ============================================
# STAGE 3: Runner - Servidor nginx
# ============================================
FROM nginx:alpine AS runner

# Copiar configuración de nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos compilados
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
