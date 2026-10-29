import {
  ProjectDetection,
  ResolvedPackage,
} from "src/modules/deployment/types.js";
import { DetectionLog, MalformedRailpackOutputError } from "./errors.js";

/**
 * Raw shape of `railpack info --format json`. Fields are intentionally loose
 * (`unknown`): Railpack evolves its output between versions, so the adapter
 * coerces defensively instead of trusting the wire format.
 */
export type RailpackInfoResponse = {
  success?: unknown;
  railpackVersion?: unknown;
  detectedProviders?: unknown;
  metadata?: unknown;
  resolvedPackages?: unknown;
  logs?: unknown;
  plan?: {
    deploy?: {
      startCommand?: unknown;
      variables?: unknown;
    };
  };
};

export function parseRailpackInfo(stdout: string): RailpackInfoResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (cause) {
    throw new MalformedRailpackOutputError(
      "railpack info did not return valid JSON",
      { cause },
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new MalformedRailpackOutputError(
      "railpack info returned JSON that is not an object",
    );
  }

  return parsed as RailpackInfoResponse;
}

/**
 * Extracts the most helpful error message from a failed (`success: false`)
 * railpack info response — normally the last log entry with level "error".
 */
export function extractFailureMessage(response: RailpackInfoResponse): string {
  const logs = toLogs(response.logs);
  const errorLog = [...logs].reverse().find((log) => log.level === "error");

  return errorLog?.message ?? "Railpack could not analyze the project";
}

/** Maps a parsed railpack info response onto the detection domain model. */
export function toProjectDetection(
  response: RailpackInfoResponse,
): ProjectDetection {
  return {
    providers: toProviders(response),
    metadata: toStringRecord(response.metadata),
    packages: toPackages(response.resolvedPackages),
    startCommand: toStartCommand(response),
    variables: toStringRecord(response.plan?.deploy?.variables),
    logs: toLogs(response.logs),
  };
}

function toProviders(response: RailpackInfoResponse): string[] {
  if (
    Array.isArray(response.detectedProviders) &&
    response.detectedProviders.every((p) => typeof p === "string")
  ) {
    return response.detectedProviders;
  }

  // Older/alternative outputs may only carry a comma-separated
  // `metadata.providers` value, e.g. "node".
  const metadata = isRecord(response.metadata) ? response.metadata : {};
  const fromMetadata = metadata["providers"];
  if (typeof fromMetadata === "string" && fromMetadata.trim() !== "") {
    return fromMetadata
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p !== "");
  }

  return [];
}

function toStartCommand(response: RailpackInfoResponse): string | null {
  const startCommand = response.plan?.deploy?.startCommand;
  return typeof startCommand === "string" && startCommand !== ""
    ? startCommand
    : null;
}

function toPackages(value: unknown): ResolvedPackage[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.values(value)
    .filter(isRecord)
    .map((entry) => ({
      name: coerceString(entry["name"]),
      requestedVersion: coerceString(entry["requestedVersion"]),
      resolvedVersion: coerceString(entry["resolvedVersion"]),
      ...(entry["source"] !== undefined
        ? { source: coerceString(entry["source"]) }
        : {}),
    }))
    .filter((pkg) => pkg.name !== "");
}

/** Maps the raw `logs` array of a railpack info response onto domain logs. */
export function toLogs(value: unknown): DetectionLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((entry) => {
    const docsPath = entry["DocsPath"];
    return {
      level: typeof entry["Level"] === "string" ? entry["Level"] : "info",
      message: coerceString(entry["Msg"]),
      ...(typeof docsPath === "string" && docsPath !== "" ? { docsPath } : {}),
    };
  });
}

function toStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, coerceString(entry)]),
  );
}

/**
 * Coerces a wire value to string without falling back to `[object Object]`
 * for structured values (JSON-encodes those instead).
 */
function coerceString(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
