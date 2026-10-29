export class DetectionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DetectionError";
  }
}

/**
 * The railpack binary could not be executed (missing from PATH, not
 * executable, ...). Wiring should treat this as a configuration/ops problem,
 * not as a property of the analyzed project.
 */

/**
 * Railpack ran successfully but could not determine how to build the project
 * (JSON `success: false`). The analyzed directory simply isn't a supported
 * project.
 */
export class UnsupportedProjectError extends DetectionError {
  readonly logs: DetectionLog[];

  constructor(
    message: string,
    options?: { logs?: DetectionLog[]; cause?: unknown },
  ) {
    super(message, options);
    this.name = "UnsupportedProjectError";
    this.logs = options?.logs ?? [];
  }
}

export class RailpackUnavailableError extends DetectionError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RailpackUnavailableError";
  }
}

/** railpack produced output we could not parse (not JSON / not an object). */
export class MalformedRailpackOutputError extends DetectionError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MalformedRailpackOutputError";
  }
}

export type DetectionLog = {
  level: string;
  message: string;
  docsPath?: string;
};

/** Base class for every error raised by the detection core. */
