# syntax=docker/dockerfile:1
# SEECARAUTO backend (NestJS API) — port 3002
FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY frontend/package.json ./frontend/
COPY admin/package.json ./admin/
COPY backend/package.json ./backend/
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter backend build

FROM node:20-alpine AS runner
RUN apk add --no-cache curl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/packages ./packages
WORKDIR /app/backend
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3002/api/v1/health || exit 1
CMD ["node", "dist/main"]
