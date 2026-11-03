import {
  ProjectConfigDetector,
  ProjectDetection,
} from "../project-detection.types";

export type DetectProjectConfigUsecase = (
  workspace: string,
) => Promise<ProjectDetection>;

export const createDetectProjectConfigUsecase = (deps: {
  detector: ProjectConfigDetector;
}): DetectProjectConfigUsecase => {
  const { detector } = deps;

  return (workspace) => detector.detect(workspace);
};
