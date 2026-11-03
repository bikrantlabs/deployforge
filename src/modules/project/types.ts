import { ProjectDetection } from "./project-detection.types";

export type Project = {
  projectId: string;
  sourceUrl: string;
  projectName: string;
  userId: string;
};

export type InspectProjectResult = {
  project: Project;
  detection: ProjectDetection;
  existing: boolean;
};
