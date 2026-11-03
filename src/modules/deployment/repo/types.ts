import { PoolClient } from "pg";
import { Outbox, ProjectJob } from "../types";

export type ProjectJobRepository = {
  createJob(job: ProjectJob, client: PoolClient): Promise<void>;
  findStatusForUser(input: {
    jobId: string;
    userId: string;
  }): Promise<ProjectJobStatusView | null>;
  markQueued(jobId: string): Promise<"queued" | "terminal" | "missing">;
  claimQueued(
    jobId: string,
    currentStage?: ProjectJob["currentStage"],
  ): Promise<boolean>;
  getStatus(jobId: string): Promise<ProjectJob["status"] | null>;
  setStatus(input: {
    jobId: string;
    status: ProjectJob["status"];
    currentStage?: ProjectJob["currentStage"];
    message?: string | null;
    client?: PoolClient;
  }): Promise<boolean>;
};

export type ProjectJobStatusView = {
  jobId: string;
  projectId: string;
  status: ProjectJob["status"];
  currentStage: ProjectJob["currentStage"];
  createdAt: Date;
  updatedAt: Date;
};

export type OutboxMessage = {
  id: string;
  jobId: string;
  topic: Outbox["topic"];
  payload: Outbox["payload"];
  createdAt: Date;
};

export type OutboxRepository = {
  create(outbox: Outbox, client: PoolClient): Promise<void>;
  listUnsent(limit: number): Promise<OutboxMessage[]>;
  markSent(id: string): Promise<void>;
};

export type TransactionRunner = <T>(
  callback: (client: PoolClient) => Promise<T>,
) => Promise<T>;
