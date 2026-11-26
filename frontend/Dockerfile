# syntax=docker/dockerfile:1
# SEECARAUTO frontend (Next.js, customer website) — port 3000
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
RUN pnpm --filter frontend build

FROM node:20-alpine AS runner
RUN apk add --no-cache curl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/package.json ./frontend/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/packages ./packages
WORKDIR /app/frontend
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000 || exit 1
CMD ["pnpm", "start"]
