import { logger } from "src/shared/logger";
import type { ProjectDeploymentRepository } from "src/modules/project/repo/types";

const DEFAULT_STALE_AFTER_MS = 20 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

/**
 * Periodically fails deployments that have been stuck in `queued` or
 * `building` past the configured threshold, so pollers never wait forever on
 * a process that died mid-build.
 */
export const createDeploymentReaper = (deps: {
  projectDeploymentRepo: ProjectDeploymentRepository;
  staleAfterMs?: number;
  sweepIntervalMs?: number;
  onReaped?: (deploymentIds: string[]) => void;
}) => {
  const {
    projectDeploymentRepo,
    staleAfterMs = DEFAULT_STALE_AFTER_MS,
    sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS,
    onReaped,
  } = deps;

  let stopped = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const sweep = async () => {
    try {
      const staleBefore = new Date(Date.now() - staleAfterMs);
      const reaped = await projectDeploymentRepo.failStale(staleBefore);

      if (reaped.length > 0) {
        logger.warn(
          { deploymentIds: reaped, staleAfterMs },
          "Failed stale deployments",
        );
        onReaped?.(reaped);
      }
    } catch (error) {
      logger.error({ error }, "Failed to sweep stale deployments");
    } finally {
      if (!stopped) {
        timer = setTimeout(() => void sweep(), sweepIntervalMs);
      }
    }
  };

  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    start() {
      if (!stopped) {
        return stop;
      }

      stopped = false;
      void sweep();
      return stop;
    },
    stop,
  };
};
