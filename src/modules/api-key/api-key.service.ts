import { createLogger } from "src/shared/logger";
import { ApiKeyRepository, ApiKeyService } from "./types/types";
import { generateApiKey } from "./utils/generate-api-key";

const logger = createLogger("ApiKeyService");

export const createApiKeyService = (deps: {
  apiKeyRepository: ApiKeyRepository;
}): ApiKeyService => {
  const { apiKeyRepository } = deps;
  const service: ApiKeyService = {
    async generate(data) {
      const { environment, name, expiresAt, userId } = data;

      const keyObject = generateApiKey(environment);

      const key = await apiKeyRepository.create({
        hash: keyObject.hash,
        prefix: keyObject.prefix,
        mask: keyObject.mask,
        name,
        userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      logger.info(
        { userId, mask: keyObject.mask },
        "API Key generated for user",
      );
      return {
        ...keyObject,
        createdAt: key.createdAt,
      };
    },
  };

  return service;
};
