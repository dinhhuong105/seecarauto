import { PrismaClient } from "@prisma/client";

// Seeds the permission catalog (M02-06, RB-01/RB-02/RB-08): exactly the
// 39 codes from API_SPEC §6. Idempotent: re-running inserts only the
// codes that are missing and never touches existing rows, so an edited
// description is never overwritten. Codes that no endpoint uses yet are
// seeded anyway and marked below — they are real catalog codes, not
// dead entries:
// - products.view, categories.view, brands.view, articles.view (RB-01):
//   admin UI display + /me + catalog only, never used to block public
//   GET endpoints.
// - fitments.update (RB-02): catalog matches §6; no endpoint uses it.
// No role or user is seeded (RB-08); this script never runs in a
// request or on app boot — it runs explicitly in the deployment flow,
// after migrations and before dependent features go live.
// Descriptions are null: API_SPEC §6 carries no per-code description
// (brief §9, Rev 02 open point — the cautious reading, never invent
// one). The seed never deletes a code that is in the DB but not in the
// catalog — it only reports it, so an unknown row is investigated,
// not silently dropped.

export const PERMISSION_CATALOG: { module: string; action: string }[] = [
  { module: "products", action: "view" },
  { module: "products", action: "create" },
  { module: "products", action: "update" },
  { module: "products", action: "delete" },
  { module: "categories", action: "view" },
  { module: "categories", action: "create" },
  { module: "categories", action: "update" },
  { module: "categories", action: "delete" },
  { module: "brands", action: "view" },
  { module: "brands", action: "create" },
  { module: "brands", action: "update" },
  { module: "brands", action: "delete" },
  { module: "vehicles", action: "view" },
  { module: "vehicles", action: "create" },
  { module: "vehicles", action: "update" },
  { module: "vehicles", action: "delete" },
  { module: "fitments", action: "view" },
  { module: "fitments", action: "create" },
  { module: "fitments", action: "update" },
  { module: "fitments", action: "delete" },
  { module: "orders", action: "view" },
  { module: "orders", action: "update" },
  { module: "orders", action: "cancel" },
  { module: "orders", action: "confirm" },
  { module: "articles", action: "view" },
  { module: "articles", action: "create" },
  { module: "articles", action: "update" },
  { module: "articles", action: "delete" },
  { module: "redirects", action: "view" },
  { module: "redirects", action: "create" },
  { module: "redirects", action: "delete" },
  { module: "roles", action: "view" },
  { module: "roles", action: "create" },
  { module: "roles", action: "update" },
  { module: "roles", action: "delete" },
  { module: "users", action: "view" },
  { module: "users", action: "update" },
  { module: "audit", action: "view" },
  { module: "dashboard", action: "view" },
];

export interface SeedPermissionsResult {
  /** Catalog codes inserted by this run. */
  created: number;
  /** Catalog codes already present (left untouched). */
  unchanged: number;
  /** Codes found in the DB that are NOT in the catalog (never deleted). */
  unknownInDb: string[];
}

export async function seedPermissions(
  prisma: PrismaClient,
): Promise<SeedPermissionsResult> {
  const catalogCodes = new Set(
    PERMISSION_CATALOG.map((c) => `${c.module}.${c.action}`),
  );
  const existing = await prisma.permission.findMany({
    select: { module: true, action: true },
  });
  const existingCodes = new Set(existing.map((p) => `${p.module}.${p.action}`));
  const missing = PERMISSION_CATALOG.filter(
    (c) => !existingCodes.has(`${c.module}.${c.action}`),
  );
  if (missing.length > 0) {
    await prisma.permission.createMany({
      data: missing.map((c) => ({
        module: c.module,
        action: c.action,
        description: null,
      })),
    });
  }
  const unknownInDb = existing
    .map((p) => `${p.module}.${p.action}`)
    .filter((code) => !catalogCodes.has(code));
  return {
    created: missing.length,
    unchanged: existingCodes.size - unknownInDb.length,
    unknownInDb,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await seedPermissions(prisma);
    // eslint-disable-next-line no-console
    console.log(
      `seed-permissions: created=${result.created} unchanged=${result.unchanged} unknownInDb=[${result.unknownInDb.join(", ")}]`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("seed-permissions failed:", error);
    process.exit(1);
  });
}
