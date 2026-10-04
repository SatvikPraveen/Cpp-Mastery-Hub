# syntax=docker/dockerfile:1.7
# Backend API image. Build context: repository root (npm workspaces share one lockfile).
#   docker build -f backend/Dockerfile -t cppmastery-backend .

FROM node:20-alpine AS deps
WORKDIR /app
# Workspace binaries (prisma, tsc, tsx) are hoisted to the root node_modules.
ENV PATH=/app/node_modules/.bin:$PATH
# Prisma's query and schema engines link against OpenSSL.
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts --workspace backend --include-workspace-root=false

FROM deps AS build
COPY backend backend
WORKDIR /app/backend
RUN prisma generate && tsc -p tsconfig.json && tsc-alias -p tsconfig.json

FROM deps AS prod-deps
COPY backend/prisma backend/prisma
RUN npm prune --omit=dev --workspace backend --include-workspace-root=false \
    && cd backend && prisma generate

FROM node:20-alpine AS runtime
ENV NODE_ENV=production PATH=/app/node_modules/.bin:$PATH
WORKDIR /app
RUN apk add --no-cache dumb-init openssl && addgroup -S app && adduser -S -G app -u 10001 app
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/backend/dist ./backend/dist
COPY --chown=app:app backend/prisma ./backend/prisma
COPY --chown=app:app backend/package.json ./backend/package.json
USER app
WORKDIR /app/backend
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:8000/health').then(r => process.exit(r.status < 500 ? 0 : 1), () => process.exit(1))"]
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
