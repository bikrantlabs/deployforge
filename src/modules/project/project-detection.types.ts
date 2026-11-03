export type ResolvedPackage = {
  name: string;
  requestedVersion: string;
  resolvedVersion: string;
  source?: string;
};

export type Step = {
  name: "install" | "build";
  commands: string[];
};

export type DetectionLog = {
  level: string;
  message: string;
  docsPath?: string;
};

export type ProjectDetection = {
  /** Detected providers, e.g. ['node'] or ['python'] */
  detectedProviders: string[];

  /** Detected steps for installing and building the project */
  steps: Step[];
  /** Provider-specific metadata, e.g. { nodePackageManager: 'npm' } */
  metadata: Record<string, string>;
  /** Toolchain packages with resolved versions */
  resolvedPackages: ResolvedPackage[];
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
