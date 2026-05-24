import { Pool } from "pg";
import { ApiKeyPrefix, ApiKeyRepository } from "../types/types";
import { DbApiKey } from "src/shared/db.types";

export const createApiKeyRepository = (db: Pool): ApiKeyRepository => {
  return {
    async create(data) {
      const { expiresAt, hash, mask, name, prefix, userId } = data;
      const { rows } = await db.query<DbApiKey>(
        "INSERT INTO api_keys(hash, mask, prefix, name, user_id, expires_at) VALUES($1, $2) RETURNING *",
        [hash, mask, prefix, name, userId, expiresAt],
      );

      if (!rows[0]) {
        throw new Error("Failed to create Api Key");
      }

      return {
        id: rows[0].id,
        createdAt: new Date(rows[0].created_at),
        isActive: rows[0].is_active,
        expiresAt: rows[0].expires_at ? new Date(rows[0].expires_at) : null,
        hash: rows[0].hash,
        mask: rows[0].mask,
        prefix: rows[0].prefix as ApiKeyPrefix,
      };
    },
  };
};
