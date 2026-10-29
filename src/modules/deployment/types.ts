import { DetectionLog } from "src/shared/railpack/errors";

export type ProjectJobStages = "cloning" | "building" | "deploying";
export type ProjectJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";
export type ProjectJobTopics =
  | "clone.requested"
  | "build.requested"
  | "deploy.requested"
  | "deploy.completed"
  | "build.completed";

export type RepoDetail = {
  fullName: string;
  sourceUrl: string;
  repoId: number;
};

export type Project = {
  projectId: string;
  sourceUrl: string;
  projectName: string;
  userId: string;
};

export type ProjectJob = {
  jobId: string;
  userId: string;
  projectId: string;
  status?: ProjectJobStatus | null;
  currentStage?: ProjectJobStages | null;
  message?: string;
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

/**
 * A package version resolved by during detection
 * (e.g. node -> 24.21.0).
 */
export type ResolvedPackage = {
  name: string;
  requestedVersion: string;
  resolvedVersion: string;
  source?: string;
};

export type ProjectDetection = {
  /** Detected providers, e.g. ['node'] or ['python'] */
  providers: string[];
  /** Provider-specific metadata, e.g. { nodePackageManager: 'npm' } */
  metadata: Record<string, string>;
  /** Toolchain packages with resolved versions */
  packages: ResolvedPackage[];
  /** Start command Railpack would use for the container, if detected */
  startCommand: string | null;
  /** Environment variables from the plan's deploy configuration */
  variables: Record<string, string>;
  /** Warnings/suggestions gathered during detection */
  logs: DetectionLog[];
};

export type ProjectConfigDetector = {
  detect(workspace: string): Promise<ProjectDetection>;
};
