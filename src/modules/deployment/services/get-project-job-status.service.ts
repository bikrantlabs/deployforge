import { NotFoundError } from "src/shared/errors/app-error";
import { ProjectJobRepository } from "../repo/types";

export const createGetProjectJobStatusService = (deps: {
  projectJobRepo: ProjectJobRepository;
}) => {
  const { projectJobRepo } = deps;

  return {
    async getStatus(input: { jobId: string; userId: string }) {
      const job = await projectJobRepo.findStatusForUser(input);
      if (!job) {
        throw new NotFoundError("Job");
      }
      return job;
    },
  };
};
