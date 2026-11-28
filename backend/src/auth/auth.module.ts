import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "../permissions/permissions.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { authConfigFromService } from "./auth.config";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

// AuthModule (M02-05) — admin JWT + refresh token auth.
// Imports PrismaModule (global) and RedisModule (global) for the DB and
// Redis services. Exports AuthService/TokenService/JwtAuthGuard so M02-06
// (RBAC) can reuse the guard and the permission-merge logic.
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    // M02-06 (RB-13): AuthService.getMe() delegates permission resolution
    // to PermissionService — the single shared resolve function.
    PermissionsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Default secret = access secret; the refresh secret is passed
        // explicitly per sign/verify call in TokenService (D-11).
        secret: authConfigFromService(configService).jwtSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, PasswordService, JwtAuthGuard],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
