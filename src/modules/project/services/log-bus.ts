import { EventEmitter } from "node:events";

// One log line. `seq` is the line number (0, 1, 2, ...) within one deployment.
export type LogLine = {
  seq: number;
  time: string;
  stream: "stdout" | "stderr";
  text: string;
};

// Shared by the build (publishes) and the SSE route (listens).
export const logBus = new EventEmitter();
logBus.setMaxListeners(0); // many browser tabs may watch one deployment

export const logChannel = (deploymentId: string) => `logs:${deploymentId}`;
export const doneChannel = (deploymentId: string) => `done:${deploymentId}`;
