import { createHmac, randomBytes } from "crypto";
import { config } from "src/shared/config/config";
import { GenerateApiKeyBody } from "../validators/api-key.validator";
import { ApiKeyPrefix } from "../types/types";

export function generateApiKeyPrefix(env: GenerateApiKeyBody["environment"]) {
  return `sk_${env}_` as ApiKeyPrefix;
}

export function generateApiKey(env: GenerateApiKeyBody["environment"]) {
  const prefix = generateApiKeyPrefix(env);

  // Raw Key
  const raw = randomBytes(32).toString("hex");
  const rawKey = prefix + raw;

  // Hash the raw key
  const hash = createHmac("sha256", config.API_KEY_SECRET)
    .update(rawKey)
    .digest("hex");

  const mask = prefix + "*".repeat(8) + raw.slice(-4); // sk_live_********ce3f
  return {
    mask,
    hash,
    rawKey,
    prefix,
  };
}
