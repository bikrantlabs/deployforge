import { createSession } from "better-sse";
import { readFile } from "node:fs/promises";
import { Request, Response } from "express";
import { NotFoundError } from "src/shared/errors/app-error";
import { LogLine, logBus, logChannel, doneChannel } from "src/modules/project/services/log-bus";
import { projectDeploymentRepo } from "src/modules/project/repo/deployment.repo";

function isLogLine(value: unknown): value is LogLine {
  if (!value || typeof value !== "object") {
    return false;
  }
  const line = value as Partial<LogLine>;
  return (
    Number.isInteger(line.seq) &&
    typeof line.time === "string" &&
    (line.stream === "stdout" || line.stream === "stderr") &&
    typeof line.text === "string"
  );
}

async function readLogFile(filePath: string): Promise<LogLine[]> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const lines: LogLine[] = [];
  for (const entry of content.split("\n")) {
    if (!entry.trim()) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(entry);
      if (isLogLine(parsed)) {
        lines.push(parsed);
      }
    } catch {
      // Ignore an incomplete final line while a build is still writing.
    }
  }
  return lines.sort((a, b) => a.seq - b.seq);
}

const isFinished = (status: string) =>
  status === "built" || status === "failed" || status === "live" || status === "cancelled";

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
  const bufferedLines: LogLine[] = [];
  const lineEvent = (line: LogLine) => {
    if (replaying) {
      bufferedLines.push(line);
      return;
    }
    pushLine(line);
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
    logBus.off(logChannel(deploymentId), lineEvent);
    logBus.off(doneChannel(deploymentId), doneEvent);
    res.off("close", cleanup);
  };
  const pushLine = (line: LogLine) => {
    if (closed || !session || line.seq <= lastSeq) {
      return;
    }
    try {
      session.push(line, "log", String(line.seq));
      lastSeq = line.seq;
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

  logBus.on(logChannel(deploymentId), lineEvent);
  logBus.on(doneChannel(deploymentId), doneEvent);
  res.once("close", cleanup);

  try {
    const history = await readLogFile(deployment.buildLogPath);
    session = await createSession(req, res, {
      trustClientEventId: false,
      keepAlive: 15_000,
      retry: 2_000,
    });

    for (const line of history) {
      pushLine(line);
    }

    const drainBufferedLines = () => {
      while (bufferedLines.length > 0 && !closed) {
        const batch = bufferedLines.splice(0).sort((a, b) => a.seq - b.seq);
        for (const line of batch) {
          pushLine(line);
        }
      }
    };
    drainBufferedLines();

    const latest = await projectDeploymentRepo.findForUser({
      deploymentId,
      userId,
    });
    drainBufferedLines();
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
