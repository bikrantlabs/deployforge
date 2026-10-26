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

export type FindProjectByIdData = {
  projectId: string;
  userId: string;
};

export type ProjectRepository = {
  create(data: CreateProjectData): Promise<void>;
  findUniqueByName(data: FindProjectByNameData): Promise<Project | null>;
  findByIdForUser(data: FindProjectByIdData): Promise<Project | null>;
};
