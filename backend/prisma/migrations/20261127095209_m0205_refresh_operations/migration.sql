-- M02-05 (D-16, Henry approved 27/11/2026) — refresh idempotency operations table.
-- PostgreSQL is the operation ownership + atomic rotation source; Redis only
-- caches the encrypted response envelope. Supplementary migration; M02-01
-- migrations untouched.
-- NOTE: Prisma's generated diff also wanted to DROP the DB-level updated_at
-- defaults and the vehicle_applications_unique_config index that M02-01 added
-- via raw SQL (Prisma @updatedAt emits no DB default; the index is not modelled
-- in the schema). Those DROPs are out of scope for M02-05 and were removed
-- from this migration — the M02-01 DB artefacts stay exactly as they are.

-- CreateEnum
CREATE TYPE "RefreshOperationState" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "auth_refresh_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "state" "RefreshOperationState" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_operations_token_hash_idempotency_key_key" ON "auth_refresh_operations"("token_hash", "idempotency_key");
