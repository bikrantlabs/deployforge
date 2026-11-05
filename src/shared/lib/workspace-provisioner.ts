import { mkdir, rm } from "node:fs/promises";
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
    if (
      project.userId === "." ||
      project.userId === ".." ||
      path.basename(project.userId) !== project.userId ||
      project.projectName === "." ||
      project.projectName === ".." ||
      path.basename(project.projectName) !== project.projectName
    ) {
      throw new Error("Invalid workspace destination.");
    }

    const root = this.WORKSPACE_ROOT ?? DEFAULT_WORKSPACE_ROOT;
    const resolvedRoot = path.resolve(expandHome(root));
    const destination = path.resolve(
      resolvedRoot,
      project.userId,
      project.projectName,
    );

    if (!destination.startsWith(resolvedRoot + path.sep)) {
      throw new Error("Invalid workspace destination.");
    }

    return destination;
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

  /**
   * Removes the cloned workspace for a project, if it exists.
   */
  async remove(project: ProjectLocation): Promise<void> {
    const destination = this.destinationFor(project);
    await rm(destination, { recursive: true, force: true });
  }
}
