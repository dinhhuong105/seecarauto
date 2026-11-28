import { HttpException } from "@nestjs/common";

// RBAC error responses (M02-06). Every RBAC error follows the Error Catalog
// exactly: { statusCode, message, error } plus `retryAfter` (seconds) where
// the Catalog specifies it, and `details` for validation errors. Messages
// are the Catalog's Vietnamese strings verbatim — never stack traces, SQL,
// table/column names or secrets.
//
// This class is separate from AuthException (M02-05) on purpose: M02-06
// must not change any M02-05 file except the two changes RB-13 explicitly
// authorizes (AuthModule imports PermissionsModule; AuthService.getMe
// delegates to PermissionService). Error bodies shared with auth (401/400/
// 503) repeat the Catalog strings verbatim so both classes answer
// identically.

export type RbacErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "ROLE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "ROLE_NAME_DUPLICATE"
  | "SERVICE_UNAVAILABLE";

export interface RbacValidationDetail {
  field: string;
  code: string;
  message: string;
}

export interface RbacErrorBody {
  statusCode: number;
  message: string;
  error: RbacErrorCode;
  retryAfter?: number;
  details?: RbacValidationDetail[];
}

export class RbacException extends HttpException {
  readonly retryAfter?: number;

  constructor(
    statusCode: number,
    code: RbacErrorCode,
    message: string,
    options?: { retryAfter?: number; details?: RbacValidationDetail[] },
  ) {
    const body: RbacErrorBody = { statusCode, message, error: code };
    if (options?.retryAfter !== undefined) body.retryAfter = options.retryAfter;
    if (options?.details !== undefined) body.details = options.details;
    super(body, statusCode);
    this.retryAfter = options?.retryAfter;
  }

  static unauthenticated(message = "Bạn chưa đăng nhập."): RbacException {
    return new RbacException(401, "UNAUTHENTICATED", message);
  }

  static forbidden(
    message = "Tài khoản của bạn không có quyền thực hiện thao tác này.",
  ): RbacException {
    return new RbacException(403, "FORBIDDEN", message);
  }

  static notFound(message = "Không tìm thấy dữ liệu yêu cầu."): RbacException {
    return new RbacException(404, "NOT_FOUND", message);
  }

  static roleNotFound(message = "Không tìm thấy vai trò."): RbacException {
    return new RbacException(404, "ROLE_NOT_FOUND", message);
  }

  static validationError(details: RbacValidationDetail[]): RbacException {
    return new RbacException(
      400,
      "VALIDATION_ERROR",
      "Dữ liệu gửi lên không hợp lệ.",
      { details },
    );
  }

  static roleNameDuplicate(
    message = "Tên vai trò này đã tồn tại.",
  ): RbacException {
    return new RbacException(409, "ROLE_NAME_DUPLICATE", message);
  }

  static serviceUnavailable(retryAfter = 5): RbacException {
    return new RbacException(
      503,
      "SERVICE_UNAVAILABLE",
      "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.",
      { retryAfter },
    );
  }
}
