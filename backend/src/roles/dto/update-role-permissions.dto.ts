import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";

// One matrix entry (OpenAPI PermissionEntry). Shape is validated here;
// catalog membership and duplicates are checked by RbacService
// (RB-03: UNKNOWN_PERMISSION / DUPLICATE_PERMISSION, 400).
export class PermissionEntryDto {
  @IsString({ message: "Module phải là chuỗi." })
  @IsNotEmpty({ message: "Module là bắt buộc." })
  module!: string;

  @IsString({ message: "Action phải là chuỗi." })
  @IsNotEmpty({ message: "Action là bắt buộc." })
  action!: string;

  @IsBoolean({ message: "granted phải là boolean." })
  granted!: boolean;
}

// PUT /roles/{roleId}/permissions body (API_SPEC §11.6, OpenAPI
// updateRolePermissions). The array replaces the WHOLE matrix; an empty
// array clears every grant. The If-Match header is required separately
// (API_SPEC §15) and checked by the service, not by this DTO.
export class UpdateRolePermissionsDto {
  @IsArray({ message: "permissions phải là mảng." })
  @ValidateNested({ each: true })
  @Type(() => PermissionEntryDto)
  permissions!: PermissionEntryDto[];
}
