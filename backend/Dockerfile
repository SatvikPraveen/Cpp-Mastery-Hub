# File: backend/Dockerfile
# Extension: (no extension)
# Location: backend/Dockerfile

# Multi-stage build for Backend
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Install all dependencies for building
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Create directories with correct permissions
RUN mkdir -p logs uploads && chown -R nodejs:nodejs logs uploads

USER nodejs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "dist/server.js"]

# Development stage
FROM base AS development
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ curl

# Install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create directories
RUN mkdir -p logs uploads

EXPOSE 8000

CMD ["npm", "run", "dev"]

# Test stage
FROM development AS test
WORKDIR /app

# Install test dependencies
RUN npm ci

# Copy test files
COPY . .

# Generate Prisma client for testing
RUN npx prisma generate

# Run tests
CMD ["npm", "run", "test:coverage"]