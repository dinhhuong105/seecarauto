import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";

// Exception filter (M02-05) — sends HttpException responses as-is, but
// copies a `retryAfter` (seconds) from the error body onto the `Retry-After`
// response header (API_SPEC §16 / Error Catalog: 429 RATE_LIMITED and 503
// SERVICE_UNAVAILABLE carry Retry-After; 423 ACCOUNT_LOCKED carries
// retryAfter in the body only). Non-auth exceptions pass through unchanged.
@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === "object" && body !== null) {
      const retryAfter = (body as { retryAfter?: unknown }).retryAfter;
      if (typeof retryAfter === "number") {
        response.setHeader("Retry-After", String(retryAfter));
      }
      response.status(status).json(body);
      return;
    }
    response.status(status).json({
      statusCode: status,
      message: String(body),
      error: "INTERNAL_ERROR",
    });
  }
}
