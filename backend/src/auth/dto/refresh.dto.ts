import { IsNotEmpty, IsString } from "class-validator";

// Refresh request (API_SPEC §11.7). The Idempotency-Key header is validated
// separately in AuthService (missing -> 400 VALIDATION_ERROR, D-14).
export class RefreshDto {
  @IsString({ message: "Refresh token phải là chuỗi." })
  @IsNotEmpty({ message: "Refresh token là bắt buộc." })
  refreshToken!: string;
}
