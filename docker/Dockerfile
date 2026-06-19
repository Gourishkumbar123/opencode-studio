# ============================================================================
# OpenCode Studio - Dockerfile
# ============================================================================

FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache python3 make g++ git curl

# ============================================================================
# Dependencies
# ============================================================================

FROM base AS dependencies

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json packages/*/

# Install dependencies
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile

# ============================================================================
# Builder
# ============================================================================

FROM dependencies AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# ============================================================================
# Production
# ============================================================================

FROM base AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache git curl bash

# Copy node_modules from builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/*/dist ./packages/*/dist

# Copy package files for CLI entrypoint
COPY --from=dependencies /app/package.json .
COPY --from=dependencies /app/pnpm-workspace.yaml .
COPY --from=dependencies /app/packages ./packages

# Create non-root user
RUN addgroup -g 1001 -S opencode && \
    adduser -S opencode -u 1001
USER opencode

# Default environment variables
ENV NODE_ENV=production
ENV OPENCODE_VERSION=0.1.0

# Expose ports
EXPOSE 3001 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Default command
CMD ["sh", "-c", "pnpm --filter @opencode/backend start"]
