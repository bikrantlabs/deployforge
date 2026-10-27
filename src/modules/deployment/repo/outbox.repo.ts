import { Pool, PoolClient } from "pg";
import { OutboxMessage, OutboxRepository } from "./types";
import { Outbox } from "../types";

export const createOutboxRepo = (pool: Pool): OutboxRepository => ({
  async create(outbox: Outbox, client: PoolClient) {
    await client.query(
      "INSERT INTO outbox (id, job_id, topic, payload) VALUES ($1, $2, $3, $4)",
      [outbox.outboxId, outbox.jobId, outbox.topic, outbox.payload],
    );
  },

  async listUnsent(limit: number) {
    const { rows } = await pool.query<{
      id: string;
      job_id: string;
      topic: Outbox["topic"];
      payload: Outbox["payload"];
      created_at: Date;
    }>(
      `SELECT id, job_id, topic, payload, created_at
       FROM outbox
       WHERE sent_at IS NULL
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );

    return rows.map(
      (row): OutboxMessage => ({
        id: row.id,
        jobId: row.job_id,
        topic: row.topic,
        payload: row.payload,
        createdAt: row.created_at,
      }),
    );
  },

  async markSent(id: string) {
    await pool.query(
      "UPDATE outbox SET sent_at = NOW() WHERE id = $1 AND sent_at IS NULL",
      [id],
    );
  },
});
