import crypto from "crypto";
import { createLogger } from "src/shared/logger";
import {
  AccessTokenPayload,
  CreateTokenData,
  RefreshTokenPayload,
  TokenPair,
  TokenRepository,
  TokenService,
} from "../auth.types";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "src/shared/config/config";
import {
  InvalidTokenError,
  AccessTokenExpiredError,
  AccessTokenRevokedError,
} from "src/shared/errors/app-error";
import { parseExpiryToMs } from "src/shared/utils/date";

const logger = createLogger("Token Service");

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex") as string;
}

export const createTokenService = (deps: {
  tokenRepository: TokenRepository;
}): TokenService => {
  const { tokenRepository } = deps;
  const service: TokenService = {
    generateAccessToken(userId: string, email: string) {
      const payload: Omit<AccessTokenPayload, "iat" | "exp"> = {
        email,
        sub: userId,
        type: "access",
      };

      return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
        expiresIn: config.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"],
      });
    },

    generateRefreshToken(userId: string): { token: string; jti: string } {
      const jti = crypto.randomUUID(); // We will use our generated `jti` as primary key for database table.

      const payload: Omit<RefreshTokenPayload, "iat" | "exp"> = {
        jti,
        sub: userId,
        type: "refresh",
      };

      const token = jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
        expiresIn: config.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"],
      });
      return {
        token,
        jti,
      };
    },

    verifyAccessToken(token: string): AccessTokenPayload {
      try {
        const decoded = jwt.verify(
          token,
          config.ACCESS_TOKEN_SECRET,
        ) as unknown;

        if (
          typeof decoded !== "object" ||
          decoded === null ||
          !("type" in decoded) ||
          decoded.type !== "access"
        ) {
          throw new InvalidTokenError();
        }

        return decoded as AccessTokenPayload;
      } catch (e) {
        if (e instanceof jwt.TokenExpiredError) {
          throw new AccessTokenExpiredError();
        }
        if (e instanceof jwt.JsonWebTokenError) {
          throw new InvalidTokenError();
        }
        throw e;
      }
    },

    /* Verify the refresh token signature - NOT IN DB, only signature */
    verifyRefreshTokenSignature(token: string): RefreshTokenPayload {
      try {
        const decoded = jwt.verify(
          token,
          config.REFRESH_TOKEN_SECRET,
        ) as unknown;

        if (
          typeof decoded !== "object" ||
          decoded === null ||
          !("type" in decoded) ||
          decoded.type !== "refresh"
        ) {
          throw new InvalidTokenError();
        }

        return decoded as RefreshTokenPayload;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          throw new AccessTokenExpiredError();
        }
        if (err instanceof jwt.JsonWebTokenError) {
          throw new InvalidTokenError();
        }
        throw err;
      }
    },

    async persistRefreshToken(data: {
      jti: string;
      userId: string;
      rawToken: string;
      meta: { ipAddress: string | null; userAgent: string | null };
    }) {
      const {
        jti,
        rawToken,
        userId,
        meta: { ipAddress, userAgent },
      } = data;
      const tokenHash = hashToken(rawToken);

      const expiresAt = new Date(
        Date.now() + parseExpiryToMs(config.REFRESH_TOKEN_EXPIRY),
      );

      const dbData: CreateTokenData = {
        id: jti,
        expiresAt,
        tokenHash,
        ipAddress,
        userAgent,
        userId,
      };

      await tokenRepository.create(dbData);

      // TODO: Cache in redis
    },

    async validateRefreshToken(rawToken: string): Promise<RefreshTokenPayload> {
      // Step 1: Verify signature
      const payload = service.verifyRefreshTokenSignature(rawToken);
      const tokenHash = hashToken(rawToken);

      // TODO: Check Redis cache
      // const cached = await cache.get<{ userId: string; tokenHash: string; expiresAt: string }>(
      //   cacheKeys.refreshToken(payload.jti)
      // );

      // if (cached) {
      //   if (cached.tokenHash !== tokenHash) {
      //     // Hash mismatch on a cached entry = likely token theft, revoke everything
      //     logger.warn({ userId: payload.sub, jti: payload.jti }, "Refresh token hash mismatch — possible theft");
      //     await tokenService.revokeAllUserTokens(payload.sub);
      //     throw new AccessTokenRevokedError();
      //   }
      //   return payload;
      // }

      // Step 3: DB fallback
      const dbToken = await tokenRepository.findById(payload.jti);
      if (!dbToken) {
        throw new InvalidTokenError();
      }
      if (dbToken.revokedAt) {
        throw new AccessTokenRevokedError();
      }
      if (dbToken.expiresAt < new Date()) {
        throw new AccessTokenExpiredError();
      }
      if (dbToken.tokenHash !== tokenHash) {
        logger.warn(
          { userId: payload.sub, jti: payload.jti },
          "Refresh token hash mismatch in DB",
        );
        await service.revokeAllUserTokens(payload.sub);
        throw new AccessTokenRevokedError();
      }

      // Re-cache on DB hit (token was evicted from Redis but is still valid)
      // await cache.set(
      //   cacheKeys.refreshToken(payload.jti),
      //   {
      //     userId: dbToken.userId,
      //     tokenHash,
      //     expiresAt: dbToken.expiresAt.toISOString(),
      //   },
      //   config.REFRESH_TOKEN_EXPIRY_SECONDS,
      // );

      return payload;
    },

    /**
     * Rotate refresh token - invalidate the old one and issue a new pair.
     */
    async rotateRefreshToken(data: {
      oldJti: string;
      userId: string;
      email: string;
      meta: { userAgent: string | null; ipAddress: string | null };
    }): Promise<TokenPair> {
      // Revoke old token in both stores
      const { email, oldJti, userId, meta } = data;
      await Promise.all([
        tokenRepository.revokeById(oldJti),
        // TODO: Delete from cache
        // cache.delete(cacheKeys.refreshToken(oldJti)),
      ]);

      // Issue new pair
      const accessToken = service.generateAccessToken(userId, email);
      const { token: newRefreshToken, jti: newJti } =
        service.generateRefreshToken(userId);

      await service.persistRefreshToken({
        jti: newJti,
        userId,
        meta,
        rawToken: newRefreshToken,
      });

      return { accessToken, refreshToken: newRefreshToken };
    },

    /**
     * Revoke a single refresh token (logout).
     */
    async revokeToken(jti: string): Promise<void> {
      await Promise.all([
        tokenRepository.revokeById(jti),
        // TODO: Remove from cache
        // cache.delete(cacheKeys.refreshToken(jti)),
      ]);
    },

    /**
     * Revoke all tokens for a user (password change, account compromise).
     */
    async revokeAllUserTokens(userId: string): Promise<void> {
      // DB: mark all as revoked
      await tokenRepository.revokeAllForUser(userId);
      // Note: we can't easily invalidate all Redis keys without a user→tokens index.
      // The keys will expire naturally. For immediate revocation at scale,
      // add a "user_version" counter to Redis — increment it, include in token, check on verify.
      // That's the blacklisting approach and avoids scanning all keys.
      logger.info({ userId }, "All tokens revoked for user");
    },
  };
  return service;
};
