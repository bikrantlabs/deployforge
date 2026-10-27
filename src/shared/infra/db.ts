import { Pool, PoolClient } from "pg";
import { logger } from "../logger";

let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT as string),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  }
  return pool;
};

export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    try {
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original operation error if rollback also fails.
      }
      throw error;
    }
  } finally {
    client.release();
  }
};

export const connectDB = async () => {
  const client = await getPool().connect();
  client.release();
  logger.info("Database connected");
};
