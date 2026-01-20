# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm@latest

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy packages (shared dependencies)
COPY packages ./packages

# Copy API app
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /build/apps/api
RUN pnpm prisma:generate

# Build the application
RUN pnpm run build

# ============================================
# Stage 2: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm/prisma + ts-node for optional seeding
RUN npm install -g pnpm@9.12.3 prisma@6.19.1 ts-node@10.9.2 typescript@5.3.3

# Copy root package files
COPY --from=builder /build/package.json /build/pnpm-lock.yaml /build/pnpm-workspace.yaml ./

# Copy packages
COPY --from=builder /build/packages ./packages

# Copy API source (for prisma migrations)
COPY --from=builder /build/apps/api/package.json ./apps/api/
COPY --from=builder /build/apps/api/prisma ./apps/api/prisma

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /build/apps/api/dist ./apps/api/dist

# Copy entrypoint
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Generate Prisma client in the runtime image (prod deps + prisma schema present)
RUN pnpm --filter @monomarket/api prisma:generate

WORKDIR /app/apps/api

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV RUN_SEED=false

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start script: run migrations, optionally seed, then start app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/apps/api/src/main.js"]
