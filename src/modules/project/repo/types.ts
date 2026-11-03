import { PoolClient } from "pg";
import { ProjectDetection } from "../project-detection.types";
import { Project } from "../types";

export type CreateProjectData = {
  projectId: string;
  projectName: string;
  sourceUrl: string;
  userId: string;
};

export type FindProjectByNameData = {
  projectName: string;
  userId: string;
};

export type FindProjectBySourceUrlData = {
  userId: string;
  sourceUrl: string;
};

export type FindProjectByIdData = {
  projectId: string;
  userId: string;
};

export type ProjectRepository = {
  create(data: CreateProjectData, client: PoolClient): Promise<void>;
  listForUser(userId: string): Promise<Project[]>;
  findUniqueByName(data: FindProjectByNameData): Promise<Project | null>;
  findUniqueBySourceUrl(
    data: FindProjectBySourceUrlData,
  ): Promise<Project | null>;
  findByIdForUser(data: FindProjectByIdData): Promise<Project | null>;
  getDecryptedKey(
    projectId: string,
    client: PoolClient,
  ): Promise<Buffer | null>;
};

export type CreateProjectDetection = {
  detectionId: string;
  projectId: string;
  detection: ProjectDetection;
};

export type ProjectDetectionRepository = {
  create(result: CreateProjectDetection, client: PoolClient): Promise<void>;
};

export type CreateEnvVarsData = {
  projectId: string;
  projectEncryptionKey: Buffer;
  envVariables: Record<string, string>;
};

export type LoadEnvVarsData = {
  projectId: string;
  projectEncrpytionKey: Buffer;
};
export type EnvVarsRepository = {
  create(input: CreateEnvVarsData, client: PoolClient): Promise<void>;
  load(input: LoadEnvVarsData): Promise<Record<string, string> | null>;
};

// Deployments

export type CreateProjectDeploymentData = {
  deploymentId: string;
  projectId: string;
};
export type ProjectDeploymentRepository = {
  create(input: CreateProjectDeploymentData, client: PoolClient): Promise<void>;
};
