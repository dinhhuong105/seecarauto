// Integration tests for the M02-01 Prisma schema (AC-10).
// Run: pnpm --filter backend test:e2e
// Uses the TEST database only (backend/.env.test, loaded by test/setup.ts).
// Test data is clearly labelled fake data — no real business data (brief §5).
// Every test truncates all app tables first, so tests are order-independent.
import { createHash } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";

jest.setTimeout(30000);

const prisma = new PrismaClient();

const TABLES = [
  "brands",
  "categories",
  "products",
  "product_identifiers",
  "product_categories",
  "product_images",
  "product_specifications",
  "vehicle_makes",
  "vehicle_models",
  "vehicle_generations",
  "vehicle_variants",
  "vehicle_applications",
  "product_vehicle_fitments",
  "fitment_change_logs",
  "url_redirects",
  "orders",
  "order_items",
  "articles",
  "article_seo",
  "users",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "user_permissions",
  "audit_logs",
  "admin_refresh_sessions",
];

async function expectPrismaError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((e as Prisma.PrismaClientKnownRequestError).code).toBe(code);
    return;
  }
  throw new Error(`Expected Prisma error ${code}, but the operation succeeded`);
}

// CHECK violations (PostgreSQL 23514) surface in Prisma 6.19.3 as
// PrismaClientUnknownRequestError with NO code — the message embeds the
// PostgreSQL error inside a Rust Debug rendering, so the quotes around the
// constraint name are backslash-escaped. Match the phrase and the name separately.
async function expectCheckViolation(
  promise: Promise<unknown>,
  constraint: string,
) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(Prisma.PrismaClientUnknownRequestError);
    const message = String((e as Error).message);
    expect(message).toContain("violates check constraint");
    expect(message).toContain(constraint);
    return;
  }
  throw new Error(
    `Expected CHECK violation ${constraint}, but the operation succeeded`,
  );
}

let n = 0;
const uniq = (prefix: string) => `${prefix}-${++n}`;

async function makeBrand() {
  const slug = uniq("brand");
  return prisma.brand.create({ data: { name: `Test Brand ${n}`, slug } });
}

async function makeCategory() {
  const slug = uniq("cat");
  return prisma.category.create({ data: { name: `Test Category ${n}`, slug } });
}

async function makeMake() {
  const slug = uniq("make");
  return prisma.vehicleMake.create({ data: { name: `Test Make ${n}`, slug } });
}

async function makeModel(makeId: string) {
  return prisma.vehicleModel.create({
    data: { makeId, name: "Test Model", slug: uniq("model") },
  });
}

async function makeUser() {
  return prisma.user.create({
    data: { username: uniq("admin"), passwordHash: "argon2id-test-hash" },
  });
}

async function makeProduct(sku?: string) {
  const brand = await makeBrand();
  const category = await makeCategory();
  return prisma.product.create({
    data: {
      sku: sku ?? uniq("SKU"),
      name: "Test Product",
      slug: uniq("product"),
      brandId: brand.id,
      categoryId: category.id,
      price: "100.00",
    },
  });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE;`,
  );
  n = 0;
});

describe("SKU + price (AC-03)", () => {
  it("rejects a duplicate SKU (P2002)", async () => {
    await makeProduct("SKU-DUP");
    await expectPrismaError(makeProduct("SKU-DUP"), "P2002");
  });

  // DB CHECK (ERD section 7) rejects blank values. Separator-only input
  // (" - ") is rejected one layer up: application-level normalization (M03-03)
  // turns it into "" before insert, and this CHECK rejects the empty result.
  it("rejects a blank SKU (CHECK products_sku_nonempty)", async () => {
    await expectCheckViolation(makeProduct("   "), "products_sku_nonempty");
  });

  it("rejects a negative price (CHECK products_price_nonnegative)", async () => {
    const brand = await makeBrand();
    const category = await makeCategory();
    await expectCheckViolation(
      prisma.product.create({
        data: {
          sku: "SKU-NEG",
          name: "Test Product",
          slug: "product-neg",
          brandId: brand.id,
          categoryId: category.id,
          price: "-1.00",
        },
      }),
      "products_price_nonnegative",
    );
  });
});

describe("identifier issuer matrix (AC-03, ERD FIX-01)", () => {
  it("OEM_NUMBER requires a make issuer and forbids a brand issuer", async () => {
    const product = await makeProduct();
    const make = await makeMake();
    const brand = await makeBrand();
    // No issuer -> reject.
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "OEM_NUMBER",
          identifierValue: "16100-0Y010",
          normalizedValue: "161000Y010",
        },
      }),
      "product_identifiers_issuer_matrix",
    );
    // Brand issuer -> reject.
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "OEM_NUMBER",
          identifierValue: "16100-0Y010",
          normalizedValue: "161000Y010",
          issuingBrandId: brand.id,
        },
      }),
      "product_identifiers_issuer_matrix",
    );
    // Make issuer -> accept.
    const row = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "OEM_NUMBER",
        identifierValue: "16100-0Y010",
        normalizedValue: "161000Y010",
        issuingMakeId: make.id,
      },
    });
    expect(row.id).toBeDefined();
  });

  it("MANUFACTURER_PART_NUMBER requires a brand issuer and forbids a make issuer", async () => {
    const product = await makeProduct();
    const make = await makeMake();
    const brand = await makeBrand();
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "MANUFACTURER_PART_NUMBER",
          identifierValue: "MPN-1",
          normalizedValue: "MPN1",
        },
      }),
      "product_identifiers_issuer_matrix",
    );
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "MANUFACTURER_PART_NUMBER",
          identifierValue: "MPN-1",
          normalizedValue: "MPN1",
          issuingMakeId: make.id,
        },
      }),
      "product_identifiers_issuer_matrix",
    );
    const row = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "MANUFACTURER_PART_NUMBER",
        identifierValue: "MPN-1",
        normalizedValue: "MPN1",
        issuingBrandId: brand.id,
      },
    });
    expect(row.id).toBeDefined();
  });

  it("PART_NUMBER allows no issuer or a brand issuer, but no make issuer", async () => {
    const product = await makeProduct();
    const make = await makeMake();
    const brand = await makeBrand();
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "PART_NUMBER",
          identifierValue: "PN-1",
          normalizedValue: "PN1",
          issuingMakeId: make.id,
        },
      }),
      "product_identifiers_issuer_matrix",
    );
    const noIssuer = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "PART_NUMBER",
        identifierValue: "PN-1",
        normalizedValue: "PN1",
      },
    });
    expect(noIssuer.id).toBeDefined();
    const withBrand = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "PART_NUMBER",
        identifierValue: "PN-2",
        normalizedValue: "PN2",
        issuingBrandId: brand.id,
      },
    });
    expect(withBrand.id).toBeDefined();
  });

  it("ALTERNATE_NUMBER allows no issuer at all", async () => {
    const product = await makeProduct();
    const make = await makeMake();
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "ALTERNATE_NUMBER",
          identifierValue: "ALT-1",
          normalizedValue: "ALT1",
          issuingMakeId: make.id,
        },
      }),
      "product_identifiers_issuer_matrix",
    );
    const row = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "ALTERNATE_NUMBER",
        identifierValue: "ALT-1",
        normalizedValue: "ALT1",
      },
    });
    expect(row.id).toBeDefined();
  });

  it("rejects empty identifier / normalized values", async () => {
    const product = await makeProduct();
    // Blank identifier_value, valid normalized_value -> value CHECK fires.
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "PART_NUMBER",
          identifierValue: "   ",
          normalizedValue: "PN1",
        },
      }),
      "product_identifiers_value_nonempty",
    );
    // Valid identifier_value, blank normalized_value -> normalized CHECK fires.
    // (Separator-only input is normalized to "" by the application, M03-03.)
    await expectCheckViolation(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "PART_NUMBER",
          identifierValue: "PN-9",
          normalizedValue: "   ",
        },
      }),
      "product_identifiers_normalized_nonempty",
    );
  });

  it("allows the same OEM number on two products, but not the same MPN per issuer", async () => {
    const p1 = await makeProduct();
    const p2 = await makeProduct();
    const make = await makeMake();
    const brandA = await makeBrand();
    const brandB = await makeBrand();
    // OEM is NOT globally unique (PD-03).
    await prisma.productIdentifier.create({
      data: {
        productId: p1.id,
        identifierType: "OEM_NUMBER",
        identifierValue: "16100-0Y010",
        normalizedValue: "161000Y010",
        issuingMakeId: make.id,
      },
    });
    const oem2 = await prisma.productIdentifier.create({
      data: {
        productId: p2.id,
        identifierType: "OEM_NUMBER",
        identifierValue: "16100-0Y010",
        normalizedValue: "161000Y010",
        issuingMakeId: make.id,
      },
    });
    expect(oem2.id).toBeDefined();
    // MPN is unique per issuer.
    await prisma.productIdentifier.create({
      data: {
        productId: p1.id,
        identifierType: "MANUFACTURER_PART_NUMBER",
        identifierValue: "MPN-9",
        normalizedValue: "MPN9",
        issuingBrandId: brandA.id,
      },
    });
    await expectPrismaError(
      prisma.productIdentifier.create({
        data: {
          productId: p2.id,
          identifierType: "MANUFACTURER_PART_NUMBER",
          identifierValue: "MPN-9",
          normalizedValue: "MPN9",
          issuingBrandId: brandA.id,
        },
      }),
      "P2002",
    );
    const otherIssuer = await prisma.productIdentifier.create({
      data: {
        productId: p2.id,
        identifierType: "MANUFACTURER_PART_NUMBER",
        identifierValue: "MPN-9",
        normalizedValue: "MPN9",
        issuingBrandId: brandB.id,
      },
    });
    expect(otherIssuer.id).toBeDefined();
    // Same product + type + normalized value is a duplicate.
    await expectPrismaError(
      prisma.productIdentifier.create({
        data: {
          productId: p1.id,
          identifierType: "MANUFACTURER_PART_NUMBER",
          identifierValue: "MPN-9",
          normalizedValue: "MPN9",
          issuingBrandId: brandA.id,
        },
      }),
      "P2002",
    );
  });

  it("allows only one primary identifier per product + type", async () => {
    const product = await makeProduct();
    await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "PART_NUMBER",
        identifierValue: "PN-A",
        normalizedValue: "PNA",
        isPrimary: true,
      },
    });
    await expectPrismaError(
      prisma.productIdentifier.create({
        data: {
          productId: product.id,
          identifierType: "PART_NUMBER",
          identifierValue: "PN-B",
          normalizedValue: "PNB",
          isPrimary: true,
        },
      }),
      "P2002",
    );
    // Same product, different type -> a primary is fine.
    const otherType = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "ALTERNATE_NUMBER",
        identifierValue: "ALT-A",
        normalizedValue: "ALTA",
        isPrimary: true,
      },
    });
    expect(otherType.id).toBeDefined();
    // Non-primary duplicates are fine.
    const nonPrimary = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "PART_NUMBER",
        identifierValue: "PN-C",
        normalizedValue: "PNC",
        isPrimary: false,
      },
    });
    expect(nonPrimary.id).toBeDefined();
  });
});

describe("vehicle applications — NULLS NOT DISTINCT + year rules (AC-03, PD-01/PD-06)", () => {
  it("treats NULLs as equal: the same (model, null, null, null) twice is a duplicate", async () => {
    const make = await makeMake();
    const model = await makeModel(make.id);
    await prisma.vehicleApplication.create({
      data: { makeId: make.id, modelId: model.id },
    });
    await expectPrismaError(
      prisma.vehicleApplication.create({
        data: { makeId: make.id, modelId: model.id },
      }),
      "P2002",
    );
    // Same model, different year -> fine.
    const otherYear = await prisma.vehicleApplication.create({
      data: { makeId: make.id, modelId: model.id, year: 2020 },
    });
    expect(otherYear.id).toBeDefined();
    // Same model + same year -> duplicate again.
    await expectPrismaError(
      prisma.vehicleApplication.create({
        data: { makeId: make.id, modelId: model.id, year: 2020 },
      }),
      "P2002",
    );
  });

  it("rejects a variant without a generation and out-of-range years", async () => {
    const make = await makeMake();
    const model = await makeModel(make.id);
    const generation = await prisma.vehicleGeneration.create({
      data: {
        modelId: model.id,
        name: "Gen 1",
        slug: "gen-1",
        yearFrom: 2015,
        yearTo: 2020,
      },
    });
    const variant = await prisma.vehicleVariant.create({
      data: {
        generationId: generation.id,
        name: "Variant X",
        slug: "variant-x",
      },
    });
    // Variant without generation -> CHECK violation.
    await expectCheckViolation(
      prisma.vehicleApplication.create({
        data: { makeId: make.id, modelId: model.id, variantId: variant.id },
      }),
      "vehicle_applications_variant_requires_generation",
    );
    // Year outside 1900-2100 -> CHECK violation.
    await expectCheckViolation(
      prisma.vehicleApplication.create({
        data: { makeId: make.id, modelId: model.id, year: 1899 },
      }),
      "vehicle_applications_year_range",
    );
    await expectCheckViolation(
      prisma.vehicleApplication.create({
        data: { makeId: make.id, modelId: model.id, year: 2101 },
      }),
      "vehicle_applications_year_range",
    );
    // Full config (model + generation + variant + year in range) -> fine.
    const full = await prisma.vehicleApplication.create({
      data: {
        makeId: make.id,
        modelId: model.id,
        generationId: generation.id,
        variantId: variant.id,
        year: 2018,
      },
    });
    expect(full.id).toBeDefined();
  });

  it("rejects a generation with year_to < year_from or year_from outside 1900-2100", async () => {
    const make = await makeMake();
    const model = await makeModel(make.id);
    await expectCheckViolation(
      prisma.vehicleGeneration.create({
        data: {
          modelId: model.id,
          name: "Bad",
          slug: "bad",
          yearFrom: 2020,
          yearTo: 2015,
        },
      }),
      "vehicle_generations_year_to_after_from",
    );
    await expectCheckViolation(
      prisma.vehicleGeneration.create({
        data: { modelId: model.id, name: "Bad", slug: "bad-2", yearFrom: 1899 },
      }),
      "vehicle_generations_year_from_range",
    );
    const ok = await prisma.vehicleGeneration.create({
      data: {
        modelId: model.id,
        name: "Good",
        slug: "good",
        yearFrom: 2015,
        yearTo: 2020,
      },
    });
    expect(ok.id).toBeDefined();
  });
});

describe("deletion policy — RESTRICT / CASCADE / soft delete (AC-10, PD-05)", () => {
  it("RESTRICTs deleting a brand or category that still has products", async () => {
    const brand = await makeBrand();
    const category = await makeCategory();
    await prisma.product.create({
      data: {
        sku: "SKU-R",
        name: "Test Product",
        slug: "product-r",
        brandId: brand.id,
        categoryId: category.id,
        price: "10.00",
      },
    });
    await expectPrismaError(
      prisma.brand.delete({ where: { id: brand.id } }),
      "P2003",
    );
    await expectPrismaError(
      prisma.category.delete({ where: { id: category.id } }),
      "P2003",
    );
  });

  it("CASCADEs product-owned children when the product is deleted", async () => {
    const product = await makeProduct();
    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl: "https://example.invalid/a.jpg",
      },
    });
    const identifier = await prisma.productIdentifier.create({
      data: {
        productId: product.id,
        identifierType: "PART_NUMBER",
        identifierValue: "PN-1",
        normalizedValue: "PN1",
      },
    });
    await prisma.product.delete({ where: { id: product.id } });
    await expect(
      prisma.productImage.findUnique({ where: { id: image.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.productIdentifier.findUnique({ where: { id: identifier.id } }),
    ).resolves.toBeNull();
  });

  it("RESTRICTs deleting a product that appears in an order (order history retention)", async () => {
    const product = await makeProduct();
    const order = await prisma.order.create({
      data: {
        orderCode: "ORD-TEST-1",
        customerName: "Test Customer",
        customerPhone: "0901234567",
        shippingAddress: "Test address",
        paymentMethod: "COD",
        totalAmount: "100.00",
        items: {
          create: {
            productId: product.id,
            productNameSnapshot: "Test Product",
            skuSnapshot: product.sku,
            unitPriceSnapshot: "100.00",
            quantity: 1,
            lineTotal: "100.00",
          },
        },
      },
    });
    expect(order.id).toBeDefined();
    await expectPrismaError(
      prisma.product.delete({ where: { id: product.id } }),
      "P2003",
    );
    await expectPrismaError(
      prisma.order.delete({ where: { id: order.id } }),
      "P2003",
    );
  });

  it("soft-deletes a product: the row stays, only deleted_at is set", async () => {
    const product = await makeProduct();
    const deleted = await prisma.product.update({
      where: { id: product.id },
      data: { deletedAt: new Date() },
    });
    expect(deleted.deletedAt).not.toBeNull();
    const found = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(found).not.toBeNull();
    expect(found!.deletedAt).not.toBeNull();
  });

  it("rejects invalid order totals and quantities (CHECK)", async () => {
    await expectCheckViolation(
      prisma.order.create({
        data: {
          orderCode: "ORD-NEG",
          customerName: "Test",
          customerPhone: "0901234567",
          shippingAddress: "Test",
          paymentMethod: "COD",
          totalAmount: "-5.00",
        },
      }),
      "orders_total_nonnegative",
    );
    const product = await makeProduct();
    const order = await prisma.order.create({
      data: {
        orderCode: "ORD-QTY",
        customerName: "Test",
        customerPhone: "0901234567",
        shippingAddress: "Test",
        paymentMethod: "COD",
        totalAmount: "100.00",
      },
    });
    await expectCheckViolation(
      prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          productNameSnapshot: "Test Product",
          skuSnapshot: product.sku,
          unitPriceSnapshot: "100.00",
          quantity: 0,
          lineTotal: "0.00",
        },
      }),
      "order_items_quantity_positive",
    );
  });
});

describe("primary image (AC-03)", () => {
  it("allows only one primary image per product", async () => {
    const product = await makeProduct();
    await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl: "https://example.invalid/a.jpg",
        isPrimary: true,
      },
    });
    await expectPrismaError(
      prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: "https://example.invalid/b.jpg",
          isPrimary: true,
        },
      }),
      "P2002",
    );
    const other = await makeProduct();
    const ok = await prisma.productImage.create({
      data: {
        productId: other.id,
        imageUrl: "https://example.invalid/c.jpg",
        isPrimary: true,
      },
    });
    expect(ok.id).toBeDefined();
  });
});

describe("articles + SEO override (AC-04, G-02)", () => {
  it("enforces a unique article slug and round-trips manualOverride", async () => {
    const article = await prisma.article.create({
      data: {
        title: "Test Article",
        slug: "test-article",
        content: "Test content",
        status: "PUBLISHED",
        seo: {
          create: {
            seoTitle: "Test SEO Title",
            metaDescription: "Test meta",
            focusKeyword: "test",
            secondaryKeywords: ["a", "b"],
            searchIntent: "informational",
            manualOverride: ["seoTitle"],
          },
        },
      },
    });
    expect(article.id).toBeDefined();
    await expectPrismaError(
      prisma.article.create({
        data: { title: "Dup", slug: "test-article", content: "x" },
      }),
      "P2002",
    );
    // Editing the SEO row keeps the manualOverride list intact (model level).
    const updated = await prisma.articleSeo.update({
      where: { articleId: article.id },
      data: { metaDescription: "Updated meta" },
    });
    expect(updated.manualOverride).toEqual(["seoTitle"]);
    expect(updated.seoTitle).toBe("Test SEO Title");
    const fetched = await prisma.article.findUnique({
      where: { id: article.id },
      include: { seo: true },
    });
    expect(fetched!.seo!.focusKeyword).toBe("test");
  });
});

describe("RBAC joins (AC-05, G-04)", () => {
  it("resolves user -> roles -> permissions and per-account exceptions", async () => {
    const permission = await prisma.permission.create({
      data: {
        module: "products",
        action: "create",
        description: "Create products",
      },
    });
    const role = await prisma.role.create({ data: { name: "Test Role" } });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id, granted: true },
    });
    const user = await makeUser();
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
    // Per-account deny exception (FR-083): granted=false overrides the role allow.
    await prisma.userPermission.create({
      data: { userId: user.id, permissionId: permission.id, granted: false },
    });
    const fetched = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
        userPermissions: { include: { permission: true } },
      },
    });
    expect(fetched!.userRoles).toHaveLength(1);
    expect(
      fetched!.userRoles[0].role.rolePermissions[0].permission.module,
    ).toBe("products");
    expect(fetched!.userRoles[0].role.rolePermissions[0].granted).toBe(true);
    expect(fetched!.userPermissions).toHaveLength(1);
    expect(fetched!.userPermissions[0].granted).toBe(false);
    // Duplicate assignments are rejected.
    await expectPrismaError(
      prisma.userRole.create({ data: { userId: user.id, roleId: role.id } }),
      "P2002",
    );
    await expectPrismaError(
      prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id, granted: true },
      }),
      "P2002",
    );
    await expectPrismaError(
      prisma.permission.create({
        data: { module: "products", action: "create" },
      }),
      "P2002",
    );
  });
  it("rejects a negative failed-login count (CHECK users_failed_attempts_nonnegative)", async () => {
    await expectCheckViolation(
      prisma.user.create({
        data: {
          username: "admin-neg",
          passwordHash: "argon2id-test-hash",
          failedLoginAttempts: -1,
        },
      }),
      "users_failed_attempts_nonnegative",
    );
  });
});

describe("admin refresh sessions (AC-06, G-04)", () => {
  it("stores only the token hash, enforces hash uniqueness, and finds revoked rows", async () => {
    const user = await makeUser();
    const rawToken = "test-refresh-token-value";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const session = await prisma.adminRefreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    expect(session.tokenHash).toBe(tokenHash);
    expect(session.tokenHash).not.toBe(rawToken);
    // Same hash again -> duplicate (reuse detection relies on finding this row).
    await expectPrismaError(
      prisma.adminRefreshSession.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      "P2002",
    );
    // Revoke, then the row is still findable by hash (reuse detection, M02-05).
    // D-15: revoking requires a reason (CHECK (revoked_at IS NULL) =
    // (revoked_reason IS NULL)) — a bare revokedAt is rejected by the DB.
    const revoked = await prisma.adminRefreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: "LOGOUT" },
    });
    expect(revoked.revokedAt).not.toBeNull();
    const found = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash },
    });
    expect(found).not.toBeNull();
    expect(found!.revokedAt).not.toBeNull();
    // A second, different session for the same user is fine.
    const otherHash = createHash("sha256")
      .update("another-token")
      .digest("hex");
    const other = await prisma.adminRefreshSession.create({
      data: {
        userId: user.id,
        tokenHash: otherHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    expect(other.id).toBeDefined();
  });
});

describe("fitment change log FK to users (AC-01, ERD section 4.18)", () => {
  it("records who changed a fitment and RESTRICTs deleting that admin", async () => {
    const product = await makeProduct();
    const make = await makeMake();
    const model = await makeModel(make.id);
    const application = await prisma.vehicleApplication.create({
      data: { makeId: make.id, modelId: model.id, year: 2020 },
    });
    const admin = await makeUser();
    const log = await prisma.fitmentChangeLog.create({
      data: {
        productId: product.id,
        vehicleApplicationId: application.id,
        action: "ATTACH",
        changedByAdminId: admin.id,
      },
    });
    expect(log.id).toBeDefined();
    await expectPrismaError(
      prisma.user.delete({ where: { id: admin.id } }),
      "P2003",
    );
    // Deleting the product CASCADEs its change logs.
    await prisma.product.delete({ where: { id: product.id } });
    await expect(
      prisma.fitmentChangeLog.findUnique({ where: { id: log.id } }),
    ).resolves.toBeNull();
  });
});

describe("audit log (AC-05)", () => {
  it("stores an append-only audit entry with before/after snapshots", async () => {
    const admin = await makeUser();
    const entry = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "UPDATE_ROLE_PERMISSIONS",
        entityType: "ROLE",
        entityId: admin.id,
        before: { permissions: [] },
        after: { permissions: ["products.create"] },
      },
    });
    expect(entry.id).toBeDefined();
    const fetched = await prisma.auditLog.findUnique({
      where: { id: entry.id },
    });
    expect((fetched!.after as Record<string, unknown>)["permissions"]).toEqual([
      "products.create",
    ]);
    // The actor cannot be deleted while audit history references them.
    await expectPrismaError(
      prisma.user.delete({ where: { id: admin.id } }),
      "P2003",
    );
  });
});

describe("updated_at contract — direct insert + Prisma bump (AC-02/AC-03, FIX-03)", () => {
  it("direct SQL INSERT omitting id/created_at/updated_at gets all DB defaults", async () => {
    await prisma.$executeRaw`INSERT INTO "brands" ("name", "slug") VALUES ('Direct Brand', 'direct-brand')`;
    const rows =
      (await prisma.$queryRaw`SELECT "id", "created_at", "updated_at" FROM "brands" WHERE "slug" = 'direct-brand'`) as {
        id: string;
        created_at: Date;
        updated_at: Date;
      }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(rows[0].created_at).toBeInstanceOf(Date);
    expect(rows[0].updated_at).toBeInstanceOf(Date);
  });

  it("Prisma update bumps updated_at and leaves created_at unchanged", async () => {
    const brand = await makeBrand();
    await new Promise((r) => setTimeout(r, 50));
    const updated = await prisma.brand.update({
      where: { id: brand.id },
      data: { name: "Test Brand Renamed" },
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      brand.updatedAt.getTime(),
    );
    expect(updated.createdAt.getTime()).toBe(brand.createdAt.getTime());
  });

  it("direct SQL UPDATE does not bump updated_at (only Prisma Client does)", async () => {
    // Documents the chosen mechanism (ERD §12: @updatedAt, not a DB trigger):
    // direct-SQL writers must set updated_at themselves if they need it bumped.
    const brand = await makeBrand();
    await prisma.$executeRaw`UPDATE "brands" SET "name" = 'Direct Renamed' WHERE "id" = ${brand.id}::uuid`;
    const fetched = await prisma.brand.findUnique({ where: { id: brand.id } });
    expect(fetched!.updatedAt.getTime()).toBe(brand.updatedAt.getTime());
  });
});

// FIX-04 boundary: these tests prove the SCHEMA stores everything the M02-05
// rotation/reuse logic needs (expiresAt, revokedAt, tokenHash unique,
// per-user session list). The enforcement itself — deciding WHEN to rotate,
// detecting reuse, revoking all sessions on reuse — is application logic
// that belongs to M02-05, not to this schema task. No Auth code is added here.
describe("refresh session lifecycle — schema capability (AC-06, FIX-04)", () => {
  const validSessions = (userId: string, now: Date) =>
    prisma.adminRefreshSession.findMany({
      where: { userId, expiresAt: { gt: now }, revokedAt: null },
    });

  async function makeSession(userId: string, token: string, expiresAt: Date) {
    return prisma.adminRefreshSession.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt,
      },
    });
  }

  it("an expired session is excluded from the valid-session query", async () => {
    const admin = await makeUser();
    await makeSession(
      admin.id,
      "expired-token",
      new Date(Date.now() - 3600_000),
    );
    expect(await validSessions(admin.id, new Date())).toHaveLength(0);
    expect(
      await prisma.adminRefreshSession.count({
        where: { userId: admin.id },
      }),
    ).toBe(1);
  });

  it("a revoked session is excluded from the valid-session query", async () => {
    const admin = await makeUser();
    const session = await makeSession(
      admin.id,
      "revoked-token",
      new Date(Date.now() + 3600_000),
    );
    // D-15: revoking requires a reason (see the CHECK note above).
    await prisma.adminRefreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: "LOGOUT" },
    });
    expect(await validSessions(admin.id, new Date())).toHaveLength(0);
  });

  it("rotation capability: a new session replaces a revoked one, old row kept", async () => {
    const admin = await makeUser();
    const oldSession = await makeSession(
      admin.id,
      "old-token",
      new Date(Date.now() + 3600_000),
    );
    const newSession = await makeSession(
      admin.id,
      "new-token",
      new Date(Date.now() + 3600_000),
    );
    await prisma.adminRefreshSession.update({
      where: { id: oldSession.id },
      data: {
        revokedAt: new Date(),
        revokedReason: "ROTATED",
        replacedBySessionId: newSession.id,
      },
    });
    const valid = await validSessions(admin.id, new Date());
    expect(valid).toHaveLength(1);
    expect(valid[0].id).toBe(newSession.id);
    const oldRow = await prisma.adminRefreshSession.findUnique({
      where: { id: oldSession.id },
    });
    expect(oldRow!.revokedAt).not.toBeNull();
  });

  it("reuse-response capability: all sessions of a user can be revoked at once", async () => {
    const admin = await makeUser();
    await makeSession(admin.id, "token-a", new Date(Date.now() + 3600_000));
    await makeSession(admin.id, "token-b", new Date(Date.now() + 3600_000));
    await makeSession(admin.id, "token-c", new Date(Date.now() + 3600_000));
    const revoked = await prisma.adminRefreshSession.updateMany({
      where: { userId: admin.id },
      data: { revokedAt: new Date(), revokedReason: "LOGOUT_ALL" },
    });
    expect(revoked.count).toBe(3);
    expect(await validSessions(admin.id, new Date())).toHaveLength(0);
  });
});
