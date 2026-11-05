import { config } from "../config/config";
import os from "node:os";
import path from "node:path";

export function buildLogPathFor(deploymentId: string): string {
  const configuredRoot = config.LOGS_DIR;
  const root = configuredRoot.startsWith("~/")
    ? path.join(os.homedir(), configuredRoot.slice(2))
    : configuredRoot;
  return path.join(path.resolve(root), "builds", `${deploymentId}.build.log`);
}
