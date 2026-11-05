import { ProjectDetection } from "./project-detection.types";

export type Project = {
  projectId: string;
  sourceUrl: string;
  projectName: string;
  userId: string;
  commandOverrides?: CommandOverrides;
  pruneDevDependencies?: boolean;
};

export type CommandOverrides = Partial<
  Record<"build" | "install" | "start", string>
>;

export type InspectProjectResult = {
  project: Project;
  detection: ProjectDetection;
  existing: boolean;
};
