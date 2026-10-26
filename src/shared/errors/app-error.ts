export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean; // false = unexpected crash, true = expected failure

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    // Maintains proper prototype chain in transpiled JS
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
}
export class UserNotVerifiedError extends AppError {
  constructor() {
    super("User not verified.", 401, "UNVERIFIED_USER");
  }
}

export class AccessTokenExpiredError extends AppError {
  constructor() {
    super("Access Token has been expired", 401, "ACCESS_TOKEN_EXPIRED");
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super("Invalid token", 401, "INVALID_TOKEN");
  }
}

export class AccessTokenRevokedError extends AppError {
  constructor() {
    super("Access Token has been revoked", 401, "ACCESS_TOKEN_REVOKED");
  }
}
// ─── Verification Code Error ──────────────────────────────────────────────────────────
export class InvalidCodeError extends AppError {
  constructor() {
    super("Invalid verification code", 404, "INVALID_CODE");
  }
}

export class UserAlreadyVerifiedError extends AppError {
  constructor() {
    super("User has been already verified", 404, "USER_ALREADY_VERIFIED");
  }
}

// ─── Resource errors ──────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

// ─── Validation errors ────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message, 422, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

// ─── Internal errors ──────────────────────────────────────────────────────────

export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500, "INTERNAL_SERVER_ERROR", false);
  }
}
