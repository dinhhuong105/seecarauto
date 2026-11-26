# syntax=docker/dockerfile:1
# SEECARAUTO admin (Next.js, admin dashboard) — port 3001
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
RUN pnpm --filter admin build

FROM node:20-alpine AS runner
RUN apk add --no-cache curl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/admin/.next ./admin/.next
COPY --from=builder /app/admin/public ./admin/public
COPY --from=builder /app/admin/package.json ./admin/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/admin/node_modules ./admin/node_modules
COPY --from=builder /app/packages ./packages
WORKDIR /app/admin
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3001 || exit 1
CMD ["pnpm", "start"]
