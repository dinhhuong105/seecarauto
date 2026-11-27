import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthException } from "./auth.errors";
import { PrismaService } from "../prisma/prisma.service";
import { RateLimitService } from "../redis/rate-limit.service";
import { RedisUnavailableError } from "../redis/redis.service";
import { TokenService } from "./token.service";

// JWT auth guard (M02-05) — authenticates an admin Bearer token for /me
// and /logout. It does NOT check permissions (no RBAC middleware in M02-05;
// that is M02-06). API_SPEC §10.5: these two endpoints require `*` =
// any authenticated admin.
//
// Check order (FIX-03/FIX-10):
// 1. Verify signature + expiry + type === "access" (expired ->
//    TOKEN_EXPIRED, otherwise UNAUTHENTICATED).
// 2. Blacklist check in Redis BEFORE accepting the request; a Redis error
//    is fail-closed -> 503 SERVICE_UNAVAILABLE (a logged-out token must
//    never "come back to life" when Redis fails, AC-18).
// 3. Session status by `sid`: the session must exist, belong to the token
//    subject, be unrevoked and unexpired — so logging out one session
//    invalidates EVERY access token of that session.
// 4. Rate limit for authenticated admins (adminAuthed, fail-open per
//    the existing rule).

export interface AuthenticatedAdmin {
  userId: string;
  sessionId: string;
  roles: string[];
  accessToken: string;
  accessTokenExp: number;
}

export type RequestWithAdmin = Request & { admin?: AuthenticatedAdmin };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const authorization = request.headers.authorization;
    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ")
    ) {
      throw AuthException.unauthenticated();
    }
    const token = authorization.slice("Bearer ".length).trim();
    if (token === "") {
      throw AuthException.unauthenticated();
    }
    const payload = this.tokens.verifyAccessToken(token);

    let blacklisted: boolean;
    try {
      blacklisted = await this.tokens.isAccessTokenBlacklisted(token);
    } catch (error) {
      if (error instanceof RedisUnavailableError) {
        throw AuthException.serviceUnavailable(5);
      }
      throw error;
    }
    if (blacklisted) {
      throw AuthException.unauthenticated();
    }

    const session = await this.prisma.adminRefreshSession.findUnique({
      where: { id: payload.sid },
    });
    if (
      session === null ||
      session.userId !== payload.sub ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date()
    ) {
      throw AuthException.unauthenticated();
    }

    const rate = await this.rateLimit.check("adminAuthed", payload.sub);
    if (!rate.allowed) {
      throw AuthException.rateLimited(
        Math.max(1, rate.resetAt - Math.floor(Date.now() / 1000)),
      );
    }

    request.admin = {
      userId: payload.sub,
      sessionId: payload.sid,
      roles: payload.roles,
      accessToken: token,
      accessTokenExp: payload.exp ?? 0,
    };
    return true;
  }
}
