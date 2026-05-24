import { GenerateApiKeyBody } from "../validators/api-key.validator";

export type ApiKeyPrefix = "sk_live_" | "sk_test_";

export type ApiKey = {
  hash: string;
  mask: string;
  createdAt: Date;
  isActive: boolean;
  prefix: ApiKeyPrefix;
  expiresAt: Date | null;
};

export type ApiKeyServiceResult = {
  rawKey: string;
  mask: string;
  createdAt: Date;
};
// ----- Services and Repository -----
export type ApiKeyService = {
  generate(
    data: {
      userId: string;
    } & GenerateApiKeyBody,
  ): Promise<ApiKeyServiceResult>;
};

export type ApiKeyRepository = {
  create(data: {
    hash: string;
    mask: string;
    userId: string;
    name: string;
    prefix: ApiKeyPrefix;
    expiresAt: Date | null;
  }): Promise<ApiKey>;
};
