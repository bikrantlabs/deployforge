import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { finished } from "node:stream/promises";
import path from "node:path";

export type LogFileWriter = {
  write(entry: string): void;
  close(): Promise<void>;
};

export async function createLogFileWriter(
  filePath: string,
): Promise<LogFileWriter> {
  await mkdir(path.dirname(filePath), { recursive: true });

  const stream = createWriteStream(filePath, { flags: "w", mode: 0o600 });
  let writeError: unknown;
  const completion = finished(stream).catch((error: unknown) => {
    writeError = error;
  });

  return {
    write(entry) {
      if (writeError === undefined) {
        stream.write(entry);
      }
    },
    async close() {
      stream.end();
      await completion;
      if (writeError !== undefined) {
        throw writeError;
      }
    },
  };
}
