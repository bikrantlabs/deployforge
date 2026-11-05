import { createSession } from "better-sse";
import { readFile } from "node:fs/promises";
import { Request, Response } from "express";
import { NotFoundError } from "src/shared/errors/app-error";
import {
  LogChunk,
  logBus,
  logChannel,
  doneChannel,
} from "src/modules/project/services/log-bus";
import { projectDeploymentRepo } from "src/modules/project/repo/deployment.repo";

function isLogChunk(value: unknown): value is LogChunk {
  if (!value || typeof value !== "object") {
    return false;
  }
  const chunk = value as Partial<LogChunk>;
  return (
    Number.isInteger(chunk.seq) &&
    typeof chunk.time === "string" &&
    (chunk.stream === "stdout" || chunk.stream === "stderr") &&
    Array.isArray(chunk.lines) &&
    chunk.lines.every((line) => typeof line === "string")
  );
}

async function readLogFile(filePath: string): Promise<LogChunk[]> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const chunks: LogChunk[] = [];
  for (const entry of content.split("\n")) {
    if (!entry.trim()) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(entry);
      if (isLogChunk(parsed)) {
        chunks.push(parsed);
      } else if (isLegacyLogLine(parsed)) {
        chunks.push({
          seq: parsed.seq,
          time: parsed.time,
          stream: parsed.stream,
          lines: [parsed.text],
        });
      }
    } catch {
      // Ignore an incomplete final line while a build is still writing.
    }
  }
  return chunks.sort((a, b) => a.seq - b.seq);
}

function isLegacyLogLine(value: unknown): value is {
  seq: number;
  time: string;
  stream: "stdout" | "stderr";
  text: string;
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const line = value as {
    seq?: unknown;
    time?: unknown;
    stream?: unknown;
    text?: unknown;
  };
  return (
    Number.isInteger(line.seq) &&
    typeof line.time === "string" &&
    (line.stream === "stdout" || line.stream === "stderr") &&
    typeof line.text === "string"
  );
}

const isFinished = (status: string) =>
  status === "built" ||
  status === "failed" ||
  status === "live" ||
  status === "cancelled";

export async function streamDeploymentLogs(input: {
  req: Request;
  res: Response;
  deploymentId: string;
  userId: string;
}): Promise<void> {
  const { req, res, deploymentId, userId } = input;
  const deployment = await projectDeploymentRepo.findForUser({
    deploymentId,
    userId,
  });
  if (!deployment) {
    throw new NotFoundError("Deployment");
  }

  let replaying = true;
  let closed = false;
  let session: Awaited<ReturnType<typeof createSession>> | undefined;
  let lastSeq = -1;
  let doneStatus: string | undefined;
  const bufferedChunks: LogChunk[] = [];
  const chunkEvent = (chunk: LogChunk) => {
    if (replaying) {
      bufferedChunks.push(chunk);
      return;
    }
    pushChunk(chunk);
  };
  const doneEvent = (status: string) => {
    doneStatus = status;
    if (!replaying) {
      finish(status);
    }
  };
  const cleanup = () => {
    if (closed) {
      return;
    }
    closed = true;
    logBus.off(logChannel(deploymentId), chunkEvent);
    logBus.off(doneChannel(deploymentId), doneEvent);
    res.off("close", cleanup);
  };
  const pushChunk = (chunk: LogChunk) => {
    if (closed || !session || chunk.seq <= lastSeq) {
      return;
    }
    try {
      session.push(chunk, "log", String(chunk.seq));
      lastSeq = chunk.seq;
    } catch {
      cleanup();
    }
  };
  const finish = (status: string) => {
    if (closed || !session) {
      return;
    }
    try {
      session.push({ status }, "done", `done-${status}`);
    } catch {
      // The connection may have closed while the final build event was emitted.
    }
    res.end();
    cleanup();
  };

  logBus.on(logChannel(deploymentId), chunkEvent);
  logBus.on(doneChannel(deploymentId), doneEvent);
  res.once("close", cleanup);

  try {
    const history = await readLogFile(deployment.buildLogPath);
    session = await createSession(req, res, {
      trustClientEventId: false,
      keepAlive: 15_000,
      retry: 2_000,
    });

    for (const chunk of history) {
      pushChunk(chunk);
    }

    const drainBufferedChunks = () => {
      while (bufferedChunks.length > 0 && !closed) {
        const batch = bufferedChunks.splice(0).sort((a, b) => a.seq - b.seq);
        for (const chunk of batch) {
          pushChunk(chunk);
        }
      }
    };
    drainBufferedChunks();

    const latest = await projectDeploymentRepo.findForUser({
      deploymentId,
      userId,
    });
    drainBufferedChunks();
    replaying = false;

    const finishedStatus = doneStatus ?? latest?.status;
    if (finishedStatus && isFinished(finishedStatus)) {
      finish(finishedStatus);
    }
  } catch (error) {
    cleanup();
    throw error;
  }
}
