export type ProjectJobStages =
  | "cloning"
  | "detecting"
  | "building"
  | "deploying";
export type ProjectJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";
export type ProjectJobTopics =
  | "clone.requested"
  | "detect.requested"
  | "build.requested"
  | "deploy.requested"
  | "deploy.completed"
  | "build.completed";

export type ProjectJob = {
  jobId: string;
  userId: string;
  projectId: string;
  status?: ProjectJobStatus | null;
  currentStage?: ProjectJobStages | null;
  message?: string;
};

export type DeploymentStatus =
  | "queued"
  | "building"
  | "built"
  | "failed"
  | "live"
  | "cancelled";

export type Deployment = {
  deploymentId: string;
  projectId: string;
  status: DeploymentStatus | null;
  imageRef: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export type JobStage = {
  stageId: string;
  jobId: string;
  stage?: ProjectJobStages;
  status?: ProjectJobStatus;
};

export type Outbox = {
  outboxId: string;
  jobId: string;
  topic: ProjectJobTopics;
  payload: object;
  createdAt: Date;
  sent_at?: Date;
};
