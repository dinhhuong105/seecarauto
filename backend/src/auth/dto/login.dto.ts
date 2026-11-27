import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

// Login request (API_SPEC §11.7, D-03 username-only, D-07 password policy:
// min 8, max 128 chars, no forced complexity rules).
export class LoginDto {
  @IsString({ message: "Tên đăng nhập phải là chuỗi." })
  @IsNotEmpty({ message: "Tên đăng nhập là bắt buộc." })
  @MaxLength(255, { message: "Tên đăng nhập tối đa 255 ký tự." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  username!: string;

  @IsString({ message: "Mật khẩu phải là chuỗi." })
  @IsNotEmpty({ message: "Mật khẩu là bắt buộc." })
  @MinLength(8, { message: "Mật khẩu tối thiểu 8 ký tự." })
  @MaxLength(128, { message: "Mật khẩu tối đa 128 ký tự." })
  password!: string;
}
