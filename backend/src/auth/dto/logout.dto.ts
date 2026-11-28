import { IsOptional, IsString } from "class-validator";

// Logout request (API_SPEC §11.7, FIX-06): refreshToken is optional.
// - Given: revoke exactly that session.
// - Omitted: revoke ALL sessions of the account.
export class LogoutDto {
  @IsOptional()
  @IsString({ message: "Refresh token phải là chuỗi." })
  refreshToken?: string;
}
