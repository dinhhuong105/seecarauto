import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard, type RequestWithAdmin } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { CreateRoleDto } from "./dto/create-role.dto";
import { ListRolesQueryDto } from "./dto/list-roles-query.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";
import { RolesService } from "./roles.service";

// Roles endpoints (M06-02, Pha 1 — API_SPEC §11.6, OpenAPI RBAC).
// Every handler stacks JwtAuthGuard (authentication + adminAuthed rate
// limit, 300/min/account) + PermissionsGuard (@RequirePermission with
// exactly the code OpenAPI declares for the operation, §2.1). Success
// responses follow the INT-007 envelope: { data } / { data, meta }.
// Errors follow the Error Catalog: { statusCode, message, error } (+
// retryAfter / details where specified).
//
// ETag (API_SPEC §15): GET matrix answers the current matrix etag in
// the `ETag` response header; PUT matrix requires `If-Match` to equal
// it (missing/stale -> 412) and answers the new etag in `ETag`.
//
// Release gate (GAP-02, AC-19): DELETE + PUT matrix are implemented and
// tested on this feature branch, but must NOT go live until M06-08
// completes Last-Super-Admin. No LAST_SUPER_ADMIN* logic exists here.
@ApiTags("Roles")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("roles.view")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Danh sách vai trò (admin)" })
  @ApiResponse({ status: 200, description: "Danh sách vai trò + userCount" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 403, description: "Không có quyền roles.view" })
  @ApiResponse({ status: 429, description: "Vượt rate limit admin" })
  async listRoles(@Query() query: ListRolesQueryDto) {
    return this.rolesService.listRoles(query.page, query.limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("roles.create")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Tạo vai trò (admin)" })
  @ApiResponse({ status: 201, description: "Vai trò đã tạo" })
  @ApiResponse({ status: 400, description: "Input không hợp lệ" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 403, description: "Không có quyền roles.create" })
  @ApiResponse({ status: 409, description: "Tên vai trò trùng" })
  async createRole(@Body() body: CreateRoleDto, @Req() req: RequestWithAdmin) {
    const admin = requireAdmin(req);
    const data = await this.rolesService.createRole(body, admin.userId);
    return { data };
  }

  @Patch(":roleId")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("roles.update")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sửa vai trò (admin)" })
  @ApiResponse({ status: 200, description: "Vai trò sau khi sửa" })
  @ApiResponse({ status: 400, description: "Input không hợp lệ" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 403, description: "Không có quyền roles.update" })
  @ApiResponse({ status: 404, description: "Vai trò không tồn tại" })
  @ApiResponse({ status: 409, description: "Tên vai trò trùng" })
  async updateRole(
    @Param("roleId") roleId: string,
    @Body() body: UpdateRoleDto,
    @Req() req: RequestWithAdmin,
  ) {
    const admin = requireAdmin(req);
    const data = await this.rolesService.updateRole(roleId, body, admin.userId);
    return { data };
  }

  @Delete(":roleId")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("roles.delete")
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Xóa vai trò (admin) — chặn khi đang được gán (409 ROLE_HAS_USERS)",
  })
  @ApiResponse({ status: 204, description: "Đã xóa vai trò" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({
    status: 403,
    description: "Không có quyền roles.delete",
  })
  @ApiResponse({ status: 404, description: "Vai trò không tồn tại" })
  @ApiResponse({
    status: 409,
    description: "Vai trò đang được gán cho tài khoản",
  })
  async deleteRole(
    @Param("roleId") roleId: string,
    @Req() req: RequestWithAdmin,
  ): Promise<void> {
    const admin = requireAdmin(req);
    await this.rolesService.deleteRole(roleId, admin.userId);
  }

  @Get(":roleId/permissions")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("roles.view")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ma trận quyền của một vai trò (admin)" })
  @ApiResponse({ status: 200, description: "Ma trận quyền của vai trò" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 403, description: "Không có quyền roles.view" })
  @ApiResponse({ status: 404, description: "Vai trò không tồn tại" })
  async getRolePermissions(
    @Param("roleId") roleId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const {
      roleId: id,
      permissions,
      etag,
    } = await this.rolesService.getRolePermissions(roleId);
    res.setHeader("ETag", etag);
    return { data: { roleId: id, permissions } };
  }

  @Put(":roleId/permissions")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission("roles.update")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật ma trận quyền của một vai trò (admin)" })
  @ApiResponse({ status: 200, description: "Ma trận quyền sau khi cập nhật" })
  @ApiResponse({ status: 400, description: "Input không hợp lệ" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 403, description: "Không có quyền roles.update" })
  @ApiResponse({ status: 404, description: "Vai trò không tồn tại" })
  @ApiResponse({ status: 412, description: "ETag không khớp" })
  async updateRolePermissions(
    @Param("roleId") roleId: string,
    @Body() body: UpdateRolePermissionsDto,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() req: RequestWithAdmin,
    @Res({ passthrough: true }) res: Response,
  ) {
    const admin = requireAdmin(req);
    const {
      roleId: id,
      permissions,
      etag,
    } = await this.rolesService.updateRolePermissions(
      roleId,
      body.permissions,
      ifMatch,
      admin.userId,
    );
    res.setHeader("ETag", etag);
    return { data: { roleId: id, permissions } };
  }
}

/** JwtAuthGuard guarantees this is set; defensive check for type safety. */
function requireAdmin(req: RequestWithAdmin) {
  const admin = req.admin;
  if (admin === undefined) {
    throw new Error("JwtAuthGuard did not attach admin");
  }
  return admin;
}
