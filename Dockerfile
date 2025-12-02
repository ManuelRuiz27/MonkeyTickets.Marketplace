# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm and build tools
RUN npm install -g pnpm@latest && \
    apk add --no-cache python3 make g++

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages and apps
COPY packages ./packages
COPY apps/api ./apps/api

# Install ALL dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
WORKDIR /build/packages/config
RUN pnpm run build

WORKDIR /build/packages/contracts
RUN pnpm run generate || echo "OpenAPI generation skipped"
RUN pnpm run build

# Generate Prisma Client and build API
WORKDIR /build/apps/api
RUN pnpm prisma:generate
RUN pnpm run build

# ============================================
# Stage 2: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy workspace config
COPY --from=builder /build/package.json /build/pnpm-lock.yaml /build/pnpm-workspace.yaml ./

# Copy built packages
COPY --from=builder /build/packages ./packages

# Copy API app
COPY --from=builder /build/apps/api/package.json ./apps/api/
COPY --from=builder /build/apps/api/prisma ./apps/api/prisma
COPY --from=builder /build/apps/api/dist ./apps/api/dist

# Install PROD dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy the entire node_modules from builder (includes Prisma client)
COPY --from=builder /build/node_modules ./node_modules

WORKDIR /app/apps/api

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start: run migrations then start
CMD sh -c "pnpm exec prisma migrate deploy && node dist/main.js"
