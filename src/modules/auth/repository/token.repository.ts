import {
  CreateTokenData,
  RefreshToken,
  TokenRepository,
} from "src/modules/auth/auth.types";
import { config } from "src/shared/config/config";
import { parseExpiryToMs } from "src/shared/utils/date";
import { DbRefreshToken } from "src/shared/db.types";
import { Pool } from "pg";

export const createTokenRepository = (pool: Pool): TokenRepository => {
  return {
    create: async (data: CreateTokenData) => {
      const { userId, expiresAt, tokenHash, id, ipAddress, userAgent } = data;
      await pool.query(
        "INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at, ip_address, user_agent) VALUES($1, $2, $3, $4, $5, $6)",
        [id, userId, tokenHash, expiresAt, ipAddress, userAgent],
      );
    },

    findById: async (id: string): Promise<RefreshToken | null> => {
      const { rows } = await pool.query<DbRefreshToken>(
        "SELECT * FROM refresh_tokens WHERE id = $1",
        [id],
      );
      if (!rows[0]) {
        return null;
      }
      return {
        id: rows[0].id,
        createdAt: new Date(rows[0].created_at),
        expiresAt: new Date(rows[0].expires_at),
        revokedAt: rows[0].revoked_at ? new Date(rows[0].revoked_at) : null,
        ipAddress: rows[0].ip_address,
        tokenHash: rows[0].token_hash,
        userAgent: rows[0].user_agent,
        userId: rows[0].user_id,
      };
    },
    revokeById: async (id: string) => {
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2",
        [new Date(), id],
      );
    },

    delete: async (id: string) => {
      await pool.query("DELETE FROM refresh_tokens WHERE id = $1", [id]);
    },
    deleteExpired: async () => {
      const time = new Date(
        Date.now() - parseExpiryToMs(config.REFRESH_TOKEN_EXPIRY),
      );
      await pool.query("DELETE FROM refresh_tokens WHERE expires_at <= $1", [
        time,
      ]);
    },

    revokeAllForUser: async (userId: string) => {
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL",
        [new Date(), userId],
      );
    },
  };
};
