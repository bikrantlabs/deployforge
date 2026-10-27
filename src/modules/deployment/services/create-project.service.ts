import { generateUUID } from "src/shared/utils/uuid-generator";
import { ProjectNameAlreadyExistsError, InvalidCloneUrl } from "../errors";
import { HttpRepoDetailFetcher } from "../lib/repo-detail-fetcher";
import {
  ProjectJobRepository,
  OutboxRepository,
  ProjectRepository,
  TransactionRunner,
} from "../repo/types";
import { Outbox, Project, ProjectJob } from "../types";

export const createCreateProjectService = (deps: {
  repoDetailFetcher: HttpRepoDetailFetcher;
  projectRepo: ProjectRepository;
  projectJobRepo: ProjectJobRepository;
  outboxRepo: OutboxRepository;
  withTransaction: TransactionRunner;
}) => {
  const {
    repoDetailFetcher,
    projectRepo,
    projectJobRepo,
    outboxRepo,
    withTransaction,
  } = deps;

  return {
    async createProject(input: {
      cloneUrl: string;
      projectName: string;
      userId: string;
    }): Promise<Project> {
      const existing = await projectRepo.findUniqueByName({
        userId: input.userId,
        projectName: input.projectName,
      });
      if (existing) {
        throw new ProjectNameAlreadyExistsError(input.projectName);
      }

      const repoDetail = await repoDetailFetcher.fetch(input.cloneUrl);
      if (!repoDetail) {
        throw new InvalidCloneUrl();
      }

      const project: Project = {
        projectId: generateUUID(),
        projectName: input.projectName,
        sourceUrl: input.cloneUrl,
        userId: input.userId,
      };
      // I decided to use transactional-outbox-pattern: Creating a projectJob row and a outbox which tracks the event.
      // the poller or relay then takes the unsent rows from outbox, and enqueues the job to the queue ("clone-queue")
      // the worker listening to clone-queue will use clone-project-service for cloning as background job.
      const job: ProjectJob = {
        jobId: generateUUID(),
        projectId: project.projectId,
        userId: project.userId,
        status: "queued",
      };

      const outbox: Outbox = {
        outboxId: generateUUID(),
        jobId: job.jobId,
        payload: { projectId: project.projectId },
        topic: "clone.requested",
        createdAt: new Date(),
      };

      await withTransaction(async (client) => {
        await projectRepo.create(project, client);
        await projectJobRepo.createJob(job, client);
        await outboxRepo.create(outbox, client);
      });

      return project;
    },
  };
};
