import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

// GET /roles query (API_SPEC §13, OpenAPI PageParam/LimitParam).
// Both params are optional (defaults page=1, limit=20). Non-integer
// values fail validation with 400 VALIDATION_ERROR; out-of-range values
// are CLAMPED by the service (page >= 1, 1 <= limit <= 100) instead of
// erroring — API_SPEC §13: limit over 100 clamps to 100, no error.
export class ListRolesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page phải là số nguyên." })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit phải là số nguyên." })
  limit?: number;
}
