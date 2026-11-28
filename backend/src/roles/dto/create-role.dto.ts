import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

// POST /roles body (API_SPEC §11.6, OpenAPI createRole).
// `name` is required, minLength 1; `description` is optional and may be
// null. Names are trimmed (a whitespace-only name is rejected as empty).
export class CreateRoleDto {
  @IsString({ message: "Tên vai trò phải là chuỗi." })
  @IsNotEmpty({ message: "Tên vai trò là bắt buộc." })
  @MinLength(1, { message: "Tên vai trò không được để trống." })
  @MaxLength(255, { message: "Tên vai trò tối đa 255 ký tự." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @IsOptional()
  @IsString({ message: "Mô tả vai trò phải là chuỗi." })
  description?: string | null;
}
