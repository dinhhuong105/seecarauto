-- M02-01 Revision 02: supplementary migration (does NOT edit 20261126152122_init).
-- Adds database-level defaults required by ERD M01-02 §2.1 / Data Dictionary:
--   * "id" DEFAULT gen_random_uuid() on every table with a single UUID PK
--     (Prisma @default(uuid()) only generates the value in Prisma Client;
--     @default(dbgenerated("gen_random_uuid()")) in schema.prisma declares it).
--   * "updated_at" DEFAULT CURRENT_TIMESTAMP (Prisma @updatedAt emits NO DB
--     default in 6.19.3, so a direct SQL INSERT omitting updated_at failed.
--     Prisma Client still sets updated_at explicitly on create/update.

ALTER TABLE "brands" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "products" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "product_identifiers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "product_images" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "product_specifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "vehicle_makes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "vehicle_models" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "vehicle_generations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "vehicle_variants" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "vehicle_applications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "product_vehicle_fitments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "fitment_change_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "url_redirects" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "order_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "articles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "admin_refresh_sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "brands" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "products" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "product_identifiers" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_makes" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_models" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_generations" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_variants" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_applications" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "product_vehicle_fitments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "articles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "article_seo" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
