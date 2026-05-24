import { getPool } from "src/shared/infra/db";
import { createApiKeyService } from "./api-key.service";
import { createApiKeyRepository } from "./repository/api-key.repository";

const pool = getPool();

export const apiKeyRepository = createApiKeyRepository(pool);

export const apiKeyService = createApiKeyService({
  apiKeyRepository,
});
