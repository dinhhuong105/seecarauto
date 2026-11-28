import { HttpException } from "@nestjs/common";

// Auth error responses (M02-05, AC-15). Every auth error follows the
// Error Catalog exactly: { statusCode, message, error } plus `retryAfter`
// (seconds) where the Catalog specifies it, and `details` for validation
// errors. Messages are the Catalog's Vietnamese strings verbatim — never
// stack traces, SQL, table/column names or secrets.

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "TOKEN_EXPIRED"
  | "INVALID_REFRESH_TOKEN"
  | "TOKEN_REUSE_DETECTED"
  | "ACCOUNT_LOCKED"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface ValidationDetail {
  field: string;
  code: string;
  message: string;
}

export interface AuthErrorBody {
  statusCode: number;
  message: string;
  error: AuthErrorCode;
  retryAfter?: number;
  details?: ValidationDetail[];
}

export class AuthException extends HttpException {
  readonly retryAfter?: number;

  constructor(
    statusCode: number,
    code: AuthErrorCode,
    message: string,
    options?: { retryAfter?: number; details?: ValidationDetail[] },
  ) {
    const body: AuthErrorBody = { statusCode, message, error: code };
    if (options?.retryAfter !== undefined) body.retryAfter = options.retryAfter;
    if (options?.details !== undefined) body.details = options.details;
    super(body, statusCode);
    this.retryAfter = options?.retryAfter;
  }

  static unauthenticated(message = "Bạn chưa đăng nhập."): AuthException {
    return new AuthException(401, "UNAUTHENTICATED", message);
  }

  static invalidCredentials(): AuthException {
    return new AuthException(
      401,
      "INVALID_CREDENTIALS",
      "Tài khoản hoặc mật khẩu không đúng.",
    );
  }

  static tokenExpired(): AuthException {
    return new AuthException(
      401,
      "TOKEN_EXPIRED",
      "Phiên đăng nhập đã hết hạn.",
    );
  }

  static invalidRefreshToken(): AuthException {
    return new AuthException(
      401,
      "INVALID_REFRESH_TOKEN",
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
    );
  }

  static tokenReuseDetected(): AuthException {
    return new AuthException(
      401,
      "TOKEN_REUSE_DETECTED",
      "Phát hiện phiên đăng nhập bất thường, vui lòng đăng nhập lại.",
    );
  }

  static accountLocked(retryAfter: number): AuthException {
    return new AuthException(
      423,
      "ACCOUNT_LOCKED",
      "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.",
      { retryAfter },
    );
  }

  static rateLimited(retryAfter: number): AuthException {
    return new AuthException(
      429,
      "RATE_LIMITED",
      "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
      { retryAfter },
    );
  }

  static validationError(details: ValidationDetail[]): AuthException {
    return new AuthException(
      400,
      "VALIDATION_ERROR",
      "Dữ liệu gửi lên không hợp lệ.",
      { details },
    );
  }

  static serviceUnavailable(retryAfter = 5): AuthException {
    return new AuthException(
      503,
      "SERVICE_UNAVAILABLE",
      "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.",
      { retryAfter },
    );
  }
}
