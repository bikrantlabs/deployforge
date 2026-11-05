import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { finished } from "node:stream/promises";
import path from "node:path";

export type LogFileWriter = {
  write(entry: string): Promise<void>;
  close(): Promise<void>;
};

export async function createLogFileWriter(
  filePath: string,
): Promise<LogFileWriter> {
  await mkdir(path.dirname(filePath), { recursive: true });

  const stream = createWriteStream(filePath, { flags: "w", mode: 0o600 });
  let writeError: unknown;
  let pendingWrite = Promise.resolve();
  const completion = finished(stream).catch((error: unknown) => {
    writeError = error;
  });

  return {
    write(entry) {
      pendingWrite = pendingWrite.then(
        () =>
          new Promise<void>((resolve, reject) => {
            if (writeError !== undefined) {
              reject(writeError);
              return;
            }
            stream.write(entry, (error) => {
              if (error) {
                writeError = error;
                reject(error);
              } else {
                resolve();
              }
            });
          }),
      );
      return pendingWrite;
    },
    async close() {
      await pendingWrite.catch(() => undefined);
      stream.end();
      await completion;
      if (writeError !== undefined) {
        throw writeError;
      }
    },
  };
}
