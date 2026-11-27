import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, type RequestWithAdmin } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RefreshDto } from "./dto/refresh.dto";

// Auth endpoints (M02-05, API_SPEC §10.5/§11.7).
// Success responses follow the INT-007 envelope: { data: {...} }.
// Errors follow the Error Catalog: { statusCode, message, error } (+
// retryAfter / details where specified).
@ApiTags("Auth")
@Controller("auth/admin")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Admin đăng nhập (tài khoản + mật khẩu)" })
  @ApiResponse({ status: 200, description: "Đăng nhập thành công" })
  @ApiResponse({ status: 400, description: "Thiếu tài khoản hoặc mật khẩu" })
  @ApiResponse({
    status: 401,
    description: "Sai tài khoản hoặc mật khẩu (message chung)",
  })
  @ApiResponse({
    status: 423,
    description: "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần",
  })
  @ApiResponse({ status: 429, description: "Vượt rate limit đăng nhập" })
  async login(
    @Body() body: LoginDto,
    @Req() req: RequestWithAdmin,
  ): Promise<{ data: Awaited<ReturnType<AuthService["login"]>> }> {
    const data = await this.authService.login(
      body.username,
      body.password,
      clientIp(req),
    );
    return { data };
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({
    summary: "Đổi refresh token lấy access token mới (xoay vòng refresh token)",
  })
  @ApiResponse({ status: 200, description: "Token mới (access + refresh mới)" })
  @ApiResponse({
    status: 400,
    description: "Thiếu refresh token hoặc thiếu header Idempotency-Key",
  })
  @ApiResponse({
    status: 401,
    description: "Refresh token không hợp lệ, đã thu hồi hoặc bị dùng lại",
  })
  @ApiResponse({
    status: 429,
    description: "Vượt rate limit refresh",
  })
  @ApiResponse({
    status: 503,
    description: "Không xác minh được trạng thái thao tác (thử lại sau)",
  })
  async refresh(
    @Body() body: RefreshDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: RequestWithAdmin,
  ): Promise<{ data: Awaited<ReturnType<AuthService["refresh"]>> }> {
    const data = await this.authService.refresh(
      body.refreshToken,
      idempotencyKey,
      clientIp(req),
    );
    return { data };
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Đăng xuất — thu hồi access token + refresh token (có refreshToken: một phiên; không có: toàn bộ phiên)",
  })
  @ApiResponse({ status: 204, description: "Đã đăng xuất" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  async logout(
    @Body() body: LogoutDto,
    @Req() req: RequestWithAdmin,
  ): Promise<void> {
    const admin = req.admin;
    if (admin === undefined) {
      // Guard guarantees this is set; defensive check for type safety.
      throw new Error("JwtAuthGuard did not attach admin");
    }
    await this.authService.logout(
      admin.userId,
      admin.accessToken,
      admin.accessTokenExp,
      body.refreshToken,
    );
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Thông tin tài khoản admin hiện tại + danh sách quyền của mình",
  })
  @ApiResponse({ status: 200, description: "Thông tin tài khoản" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  async me(
    @Req() req: RequestWithAdmin,
  ): Promise<{ data: Awaited<ReturnType<AuthService["getMe"]>> }> {
    const admin = req.admin;
    if (admin === undefined) {
      throw new Error("JwtAuthGuard did not attach admin");
    }
    const data = await this.authService.getMe(admin.userId);
    return { data };
  }
}

function clientIp(req: RequestWithAdmin): string {
  return req.ip ?? "unknown";
}
