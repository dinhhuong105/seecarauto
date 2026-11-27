import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { AuthExceptionFilter } from "./auth/auth-exception.filter";
import { AuthException, type ValidationDetail } from "./auth/auth.errors";

// Shared application setup (used by main.ts and by e2e specs so the test
// app behaves exactly like production): global /api/v1 prefix, global
// validation (API_SPEC §9: DTO violations -> 400 VALIDATION_ERROR with
// per-field details, unknown fields stripped), and the auth exception
// filter (copies `retryAfter` onto the `Retry-After` header for 429/503
// only — 423 carries retryAfter in the body only, Error Catalog).
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        AuthException.validationError(toValidationDetails(errors)),
    }),
  );
  app.useGlobalFilters(new AuthExceptionFilter());
  return app;
}

const CONSTRAINT_CODES: Record<string, string> = {
  isNotEmpty: "REQUIRED",
  isString: "INVALID_TYPE",
  minLength: "MIN_LENGTH",
  maxLength: "MAX_LENGTH",
  isUUID: "INVALID_FORMAT",
  isDefined: "REQUIRED",
};

/** Flattens class-validator errors into Error Catalog `details`. */
function toValidationDetails(errors: ValidationError[]): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  for (const error of errors) {
    const constraints = error.constraints ?? {};
    for (const [constraint, message] of Object.entries(constraints)) {
      details.push({
        field: error.property,
        code: CONSTRAINT_CODES[constraint] ?? constraint.toUpperCase(),
        message,
      });
    }
    if (error.children !== undefined && error.children.length > 0) {
      details.push(...toValidationDetails(error.children));
    }
  }
  return details;
}
