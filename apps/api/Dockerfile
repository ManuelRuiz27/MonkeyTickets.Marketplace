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

# Install pnpm and prisma (needed for migrations)
RUN npm install -g pnpm@latest prisma

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

# Copy node_modules with Prisma client
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start script: run migrations then start app
CMD sh -c "pnpm prisma:migrate:deploy && node dist/apps/api/src/main.js"
