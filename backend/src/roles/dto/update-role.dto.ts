import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

// PATCH /roles/{roleId} body (API_SPEC §11.6, OpenAPI updateRole).
// Every field is optional, but at least one field must be present — the
// service rejects an empty body with 400 VALIDATION_ERROR (Stage 2
// decision, brief §5: "ít nhất một trường"). `description: null` clears
// the description; omitting it leaves it unchanged.
export class UpdateRoleDto {
  @IsOptional()
  @IsString({ message: "Tên vai trò phải là chuỗi." })
  @MinLength(1, { message: "Tên vai trò không được để trống." })
  @MaxLength(255, { message: "Tên vai trò tối đa 255 ký tự." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString({ message: "Mô tả vai trò phải là chuỗi." })
  description?: string | null;
}
