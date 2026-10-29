import { NotFoundError } from "src/shared/errors/app-error";
import { ProjectConfigDetector } from "../types";
import { ProjectRepository } from "../repo/types";
import { WorkspaceProvisioner } from "../lib/workspace-provisioner";
import { createLogger } from "src/shared/logger";

const logger = createLogger("detect-project");

export const createDetectProjectService = (deps: {
  projectRepo: ProjectRepository;
  workspace: Pick<WorkspaceProvisioner, "destinationFor">;
  detector: ProjectConfigDetector;
}) => {
  const { projectRepo, workspace, detector } = deps;

  return {
    async detectProject(input: { projectId: string; userId: string }) {
      const lookupStartedAt = Date.now();
      logger.info({ projectId: input.projectId }, "Detection request received");
      const project = await projectRepo.findByIdForUser(input);
      logger.info(
        {
          projectId: input.projectId,
          durationMs: Date.now() - lookupStartedAt,
          found: Boolean(project),
        },
        "Detection project lookup completed",
      );
      if (!project) {
        throw new NotFoundError("Project");
      }

      const destinationPath = workspace.destinationFor(project);
      logger.info(
        { projectId: project.projectId },
        "Starting project analysis",
      );
      const detection = await detector.detect(destinationPath);

      return {
        projectId: project.projectId,
        projectName: project.projectName,
        detection,
      };
    },
  };
};
