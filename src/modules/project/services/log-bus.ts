import { EventEmitter } from "node:events";

// One stream callback chunk. `seq` is the chunk number within one deployment.
export type LogChunk = {
  seq: number;
  time: string;
  stream: "stdout" | "stderr";
  lines: string[];
};

// Shared by the build (publishes) and the SSE route (listens).
export const logBus = new EventEmitter();
logBus.setMaxListeners(0); // many browser tabs may watch one deployment

export const logChannel = (deploymentId: string) => `logs:${deploymentId}`;
export const doneChannel = (deploymentId: string) => `done:${deploymentId}`;
