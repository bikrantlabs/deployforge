import { PoolClient } from "pg";
import { generateUUID } from "src/shared/utils/uuid-generator";
import { ProjectDetection } from "../project-detection.types";
import { ProjectDetectionResultRepository } from "../repo/types";

export type PersistProjectDetectionUsecase = (input: {
  projectId: string;
  detection: ProjectDetection;
  client: PoolClient;
}) => Promise<{ detectionId: string }>;

export const createPersistProjectDetectionUsecase = (deps: {
  projectDetectionResultRepo: ProjectDetectionResultRepository;
}): PersistProjectDetectionUsecase => {
  const { projectDetectionResultRepo } = deps;

  return async ({ projectId, detection, client }) => {
    const detectionId = generateUUID();

    await projectDetectionResultRepo.create(
      {
        detectionId,
        projectId,
        detection,
      },
      client,
    );

    return { detectionId };
  };
};
