# syntax=docker/dockerfile:1.7
# Web client image (Next.js standalone server). Build context: repository root.
#   docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t cppmastery-frontend .

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts --workspace frontend --include-workspace-root=false

FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000
ARG NEXT_PUBLIC_ENABLE_OAUTH=false
ARG NEXT_PUBLIC_ENABLE_COLLABORATION=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_ENABLE_OAUTH=$NEXT_PUBLIC_ENABLE_OAUTH \
    NEXT_PUBLIC_ENABLE_COLLABORATION=$NEXT_PUBLIC_ENABLE_COLLABORATION \
    NEXT_TELEMETRY_DISABLED=1
COPY frontend frontend
RUN npm run build --workspace frontend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S -G app -u 10001 app
# The standalone output mirrors the monorepo layout, so the server lives in frontend/.
COPY --from=build --chown=app:app /app/frontend/.next/standalone ./
COPY --from=build --chown=app:app /app/frontend/.next/static ./frontend/.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "frontend/server.js"]
