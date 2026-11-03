import { Pool } from "pg";
import { EnvVarsRepository } from "./types";
import { decryptBytes, encryptBytes } from "../services/encryption.service";

export const createEnvVarsRepo = (pool: Pool): EnvVarsRepository => ({
  async create(input, client): Promise<void> {
    const { envVariables, projectEncryptionKey, projectId } = input;
    const names = Object.keys(envVariables);
    if (names.length === 0) {
      return;
    }

    const encryptedValues = names.map((name) => {
      const value = envVariables[name]!;

      const buffer = Buffer.from(value, "utf8");

      const label = `${projectId}|${name}`;
      return encryptBytes(projectEncryptionKey, buffer, label);
    });

    /**
     * The unnest will convert the arrays into SQL rows
     */
    await client.query(
      `INSERT INTO env_vars (project_id, name, encrypted_value)
       SELECT $1, n, v FROM unnest($2::text[], $3::bytea[]) AS t(n, v)
       ON CONFLICT (project_id, name)
       DO UPDATE SET encrypted_value = EXCLUDED.encrypted_value, updated_at = now()`,
      [projectId, names, encryptedValues],
    );
  },
  async load(input): Promise<Record<string, string> | null> {
    const { rows } = await pool.query<{
      name: string;
      encrypted_value: Buffer;
    }>(
      `
        SELECT name, encrypted_value FROM env_vars WHERE project_id = $1
      `,
      [input.projectId],
    );
    const envVariables: Record<string, string> = {};
    for (const row of rows) {
      const decrypted = decryptBytes(
        input.projectEncrpytionKey,
        row.encrypted_value,
        `${input.projectId}|${row.name}`,
      );
      envVariables[row.name] = decrypted.toString("utf8");
    }
    return envVariables;
  },
});
