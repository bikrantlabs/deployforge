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
};

export type CreateProjectDetection = {
  detectionId: string;
  projectId: string;
  detection: ProjectDetection;
};

export type ProjectDetectionRepository = {
  create(result: CreateProjectDetection, client: PoolClient): Promise<void>;
};
