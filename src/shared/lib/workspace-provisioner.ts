import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DEFAULT_WORKSPACE_ROOT = "~/.deployforge";

type ProjectLocation = {
  userId: string;
  projectName: string;
};

function expandHome(target: string): string {
  if (target === "~") {
    return os.homedir();
  }
  if (target.startsWith("~/")) {
    return path.join(os.homedir(), target.slice(2));
  }
  return target;
}

export class WorkspaceProvisioner {
  private readonly WORKSPACE_ROOT: string | undefined;
  constructor() {}

  destinationFor(project: ProjectLocation): string {
    const root = this.WORKSPACE_ROOT ?? DEFAULT_WORKSPACE_ROOT;
    return path.resolve(expandHome(root), project.userId, project.projectName);
  }

  /**
   *
   * @param project - Project Object
   * @returns destination - The destionation directory where the project will be cloned into: /userId/projectName
   */
  async prepare(project: ProjectLocation): Promise<string> {
    // Keyed on the user id + project name so the location can be reconstructed
    // by later background jobs without persisting clone output.
    const destination = this.destinationFor(project);

    await mkdir(destination, { recursive: true });

    return destination;
  }
}
