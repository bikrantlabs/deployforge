import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import {
  AppError,
  DeploymentBuildError,
  ValidationError,
  InternalServerError,
  RateLimitError,
} from "./app-error";
import { createLogger } from "../logger";

const logger = createLogger("error-handler");

/**
 * Converts a ZodError into a ValidationError with field-level detail.
 * Zod runs at the validator layer, but we catch it here as a safety net too.
 */
function handleZodError(err: ZodError): ValidationError {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".");
    if (!fields[path]) {
      fields[path] = [];
    }
    fields[path].push(issue.message);
  }
  return new ValidationError("Validation failed", fields);
}

function setRateLimitHeaders(res: Response, err: AppError): void {
  if (!(err instanceof RateLimitError)) {
    return;
  }

  const retryAfterSeconds =
    err.retryAfterSeconds ?? err.timeInSeconds ?? 0;

  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    return;
  }

  const resetEpochSeconds = Math.ceil(Date.now() / 1000 + retryAfterSeconds);

  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.setHeader("retry-after", String(retryAfterSeconds));
  res.setHeader("x-retry-after", String(retryAfterSeconds));
  res.setHeader("X-RateLimit-Reset", String(resetEpochSeconds));
  res.setHeader("x-ratelimit-reset", String(resetEpochSeconds));
  res.setHeader("X-RateLimit-Limit", String(retryAfterSeconds));
  res.setHeader("x-ratelimit-limit", String(retryAfterSeconds));
  res.setHeader("X-RateLimit-Remaining", "0");
  res.setHeader("x-ratelimit-remaining", "0");
}

/**
 * Formats the error response sent to the client.
 * Non-operational errors get a generic message — never leak stack traces.
 */
function formatErrorResponse(err: AppError, includeStack: boolean) {
  const body: Record<string, unknown> = {
    success: false,
    error: {
      code: err.code,
      message: err.isOperational ? err.message : "Something went wrong",
    },
  };

  if (err instanceof RateLimitError) {
    (body.error as Record<string, unknown>).retryAfterSeconds =
      err.retryAfterSeconds;
    (body.error as Record<string, unknown>).timeInSeconds = err.timeInSeconds;
  }

  if (err instanceof DeploymentBuildError && err.isOperational) {
    const error = body.error as Record<string, unknown>;
    error.exitCode = err.exitCode;
    error.retryable = err.retryable;
    error.logs = err.logs;
  }

  // Include field errors for validation failures
  if (err instanceof ValidationError && err.fields) {
    (body.error as Record<string, unknown>).fields = err.fields;
  }

  // Only include stack in development
  if (includeStack && err.stack) {
    (body.error as Record<string, unknown>).stack = err.stack;
  }

  return body;
}

/**
 * Express error-handling middleware. Must be registered LAST with app.use().
 * The 4-parameter signature is required for Express to recognise it as error middleware.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV !== "production";

  // Normalise to AppError
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = handleZodError(err);
  } else {
    // Unknown error — wrap it but mark as non-operational
    appError = new InternalServerError(err.message);
  }

  // Log operational errors at warn, unexpected at error
  if (!appError.isOperational) {
    logger.error(
      { err: appError, req: { method: req.method, url: req.url } },
      "Unexpected error",
    );
  } else if (appError.statusCode >= 500) {
    logger.warn(
      { err: appError, req: { method: req.method, url: req.url } },
      "Operational server error",
    );
  }

  setRateLimitHeaders(res, appError);
  res.status(appError.statusCode).json(formatErrorResponse(appError, isDev));
}

/**
 * Wraps async route handlers so you don't need try/catch in every controller.
 * Usage: router.post("/register", asyncHandler(authController.register))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
