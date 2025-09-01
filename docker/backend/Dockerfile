# File: docker/backend/Dockerfile
# Extension: Dockerfile

# Multi-stage build for Node.js backend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    dumb-init

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
ENV NODE_ENV production
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Production stage
FROM base AS runner
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]