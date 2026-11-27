-- M02-05 (D-15, Henry approved 27/11/2026) — revocation reason + replacement link
-- for admin_refresh_sessions. Supplementary migration; M02-01 migrations untouched.
-- NOTE: Prisma's generated diff also wanted to DROP the DB-level updated_at
-- defaults and the vehicle_applications_unique_config index that M02-01 added
-- via raw SQL (Prisma @updatedAt emits no DB default; the index is not modelled
-- in the schema). Those DROPs are out of scope for M02-05 and were removed
-- from this migration — the M02-01 DB artefacts stay exactly as they are.

-- CreateEnum
CREATE TYPE "RefreshSessionRevocationReason" AS ENUM ('ROTATED', 'LOGOUT', 'LOGOUT_ALL', 'ADMIN_REVOKED', 'REUSE_DETECTED');

-- AlterTable
ALTER TABLE "admin_refresh_sessions" ADD COLUMN     "replaced_by_session_id" UUID,
ADD COLUMN     "revoked_reason" "RefreshSessionRevocationReason";

-- AddForeignKey
ALTER TABLE "admin_refresh_sessions" ADD CONSTRAINT "admin_refresh_sessions_replaced_by_session_id_fkey" FOREIGN KEY ("replaced_by_session_id") REFERENCES "admin_refresh_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints (FIX-09; Prisma 6.19.3 has no @@check — raw SQL per repo convention).
-- A session is ACTIVE iff revoked_at AND revoked_reason are both NULL.
ALTER TABLE "admin_refresh_sessions" ADD CONSTRAINT "admin_refresh_sessions_revoked_reason_check" CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL));

-- replaced_by_session_id may only be set when the reason is ROTATED.
ALTER TABLE "admin_refresh_sessions" ADD CONSTRAINT "admin_refresh_sessions_replaced_by_session_check" CHECK ((replaced_by_session_id IS NULL OR revoked_reason = 'ROTATED'));
