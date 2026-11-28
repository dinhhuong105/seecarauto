import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateRoleDto } from "./create-role.dto";
import { ListRolesQueryDto } from "./list-roles-query.dto";
import { UpdateRoleDto } from "./update-role.dto";
import { UpdateRolePermissionsDto } from "./update-role-permissions.dto";

// DTO unit tests (M06-02, Pha 1) — pure class-validator checks, no HTTP.
// The service-level rules (duplicate name, at-least-one-field PATCH,
// unknown/duplicate permission codes) live in RolesService/RbacService
// and are tested in roles.service.spec.ts + the e2e spec.

describe("Roles DTOs (unit)", () => {
  describe("CreateRoleDto", () => {
    it("accepts { name } and { name, description }", async () => {
      expect(
        await validate(plainToInstance(CreateRoleDto, { name: "seller" })),
      ).toEqual([]);
      expect(
        await validate(
          plainToInstance(CreateRoleDto, {
            name: "seller",
            description: "Bán hàng",
          }),
        ),
      ).toEqual([]);
      expect(
        await validate(
          plainToInstance(CreateRoleDto, { name: "seller", description: null }),
        ),
      ).toEqual([]);
    });

    it("rejects missing/empty/whitespace-only name and non-string description", async () => {
      const missing = await validate(plainToInstance(CreateRoleDto, {}));
      expect(missing).toHaveLength(1);
      expect(missing[0].property).toBe("name");
      const empty = await validate(
        plainToInstance(CreateRoleDto, { name: "" }),
      );
      expect(empty.length).toBeGreaterThan(0);
      const spaces = await validate(
        plainToInstance(CreateRoleDto, { name: "   " }),
      );
      expect(spaces.length).toBeGreaterThan(0);
      const badDesc = await validate(
        plainToInstance(CreateRoleDto, { name: "seller", description: 42 }),
      );
      expect(badDesc).toHaveLength(1);
      expect(badDesc[0].property).toBe("description");
    });
  });

  describe("UpdateRoleDto", () => {
    it("accepts a partial update and a description clear (null)", async () => {
      expect(
        await validate(plainToInstance(UpdateRoleDto, { name: "new" })),
      ).toEqual([]);
      expect(
        await validate(plainToInstance(UpdateRoleDto, { description: null })),
      ).toEqual([]);
    });

    it("rejects an empty name", async () => {
      const errors = await validate(
        plainToInstance(UpdateRoleDto, { name: "" }),
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("name");
    });
  });

  describe("UpdateRolePermissionsDto", () => {
    it("accepts a full matrix and an empty matrix (clear all)", async () => {
      expect(
        await validate(
          plainToInstance(UpdateRolePermissionsDto, {
            permissions: [
              { module: "products", action: "view", granted: true },
              { module: "roles", action: "delete", granted: false },
            ],
          }),
        ),
      ).toEqual([]);
      expect(
        await validate(
          plainToInstance(UpdateRolePermissionsDto, { permissions: [] }),
        ),
      ).toEqual([]);
    });

    it("rejects a missing permissions array and a non-boolean granted", async () => {
      const missing = await validate(
        plainToInstance(UpdateRolePermissionsDto, {}),
      );
      expect(missing.length).toBeGreaterThan(0);
      const badGranted = await validate(
        plainToInstance(UpdateRolePermissionsDto, {
          permissions: [{ module: "products", action: "view", granted: "yes" }],
        }),
      );
      expect(badGranted.length).toBeGreaterThan(0);
    });
  });

  describe("ListRolesQueryDto", () => {
    it("accepts empty query and numeric page/limit strings", async () => {
      expect(await validate(plainToInstance(ListRolesQueryDto, {}))).toEqual(
        [],
      );
      expect(
        await validate(
          plainToInstance(ListRolesQueryDto, { page: "2", limit: "50" }),
        ),
      ).toEqual([]);
    });

    it("rejects non-integer page/limit", async () => {
      const badPage = await validate(
        plainToInstance(ListRolesQueryDto, { page: "abc" }),
      );
      expect(badPage.length).toBeGreaterThan(0);
      const badLimit = await validate(
        plainToInstance(ListRolesQueryDto, { limit: "1.5" }),
      );
      expect(badLimit.length).toBeGreaterThan(0);
    });
  });
});
