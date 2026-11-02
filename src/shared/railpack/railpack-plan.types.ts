/**
 * Types for the JSON printed by `railpack prepare` / `railpack build --show-plan`
 * (railpackVersion 0.41.0).
 *
 * Built from two sample outputs only: a Python (Flask, pip) project and a
 * Node (Next.js, pnpm) project. Fields marked "unverified" were not seen
 * in both samples or are guesses, so check them against more output.
 * This is NOT the schema of railpack.json (the input config).
 */

// ---------------------------------------------------------------- top level

export type RailpackPlanOutput = {
  railpackVersion: string;
  plan: BuildPlan;
  resolvedPackages: Record<string, ResolvedPackage>;
  metadata: PlanMetadata;
  detectedProviders: string[];
  logs: PlanLog[];
  success: boolean;
};

export type ResolvedPackage = {
  name: string;
  requestedVersion: string;
  resolvedVersion: string;
  /** Seen: "railpack default", "idiomatic-version-file" */
  source: string;
};

/** Keys depend on the provider; every value seen so far is a string. */
export type PlanMetadata = {
  providers?: string;
  pythonPackageManager?: string;
  pythonRuntime?: string;
  nodePackageManager?: string;
  nodeRuntime?: string;
  [key: string]: string | undefined;
};

export type PlanLog = {
  /** Seen: "info". "warn" / "error" are unverified. */
  Level: "info" | "warn" | "error" | (string & object);
  Msg: string;
  DocsPath: string;
};

// --------------------------------------------------------------------- plan

export type BuildPlan = {
  steps: Step[];
  /** Keyed by cache id; steps and deploy refer to these ids. */
  caches: Record<string, Cache>;
  deploy: Deploy;
};

export type Cache = {
  directory: string;
  /** Seen: "shared", "locked". Other BuildKit modes are unverified. */
  type: "shared" | "locked" | (string & object);
};

// -------------------------------------------------------------------- steps

export type Step = {
  name: string;
  inputs: StepInput[];
  /** Absent on steps that only combine inputs (e.g. the Python "build" step). */
  commands?: Command[];
  /** Name -> file contents, referenced by FileCommand.name. */
  assets?: Record<string, string>;
  /** Environment variables for this step's commands. */
  variables?: Record<string, string>;
  /** Cache ids (keys of BuildPlan.caches) mounted in this step. */
  caches?: string[];
  /** Seen: ["*"] meaning all secrets are available. */
  secrets?: string[];
};

type FilterFields = {
  include?: string[];
  exclude?: string[];
};

export type StepInput = ImageInput | StepRefInput | LocalInput;

/** Start from a container image. */
export type ImageInput = {
  image: string;
} & FilterFields;

/** Start from the output of another step. */
export type StepRefInput = {
  step: string;
} & FilterFields;

/** Files from the local build context. */
export type LocalInput = {
  local: true;
} & FilterFields;

// ----------------------------------------------------------------- commands

export type Command = PathCommand | FileCommand | ExecCommand | CopyCommand;

/** Add a directory to PATH. */
export type PathCommand = {
  path: string;
  customName?: string;
};

/** Write an entry from Step.assets to `path` (e.g. /etc/mise/config.toml). */
export type FileCommand = {
  path: string;
  /** Key in Step.assets. */
  name: string;
  customName?: string;
};

/** Run a shell command. */
export type ExecCommand = {
  cmd: string;
  customName?: string;
};

/** Copy from the build context into the image. */
export type CopyCommand = {
  src: string;
  dest: string;
  customName?: string;
};

// FileCommand must be checked before PathCommand (both have `path`).
export const isFileCommand = (c: Command): c is FileCommand =>
  "path" in c && "name" in c;
export const isPathCommand = (c: Command): c is PathCommand =>
  "path" in c && !("name" in c);
export const isExecCommand = (c: Command): c is ExecCommand => "cmd" in c;
export const isCopyCommand = (c: Command): c is CopyCommand =>
  "src" in c && "dest" in c;

export const isImageInput = (i: StepInput): i is ImageInput => "image" in i;
export const isStepRefInput = (i: StepInput): i is StepRefInput => "step" in i;
export const isLocalInput = (i: StepInput): i is LocalInput => "local" in i;

// ------------------------------------------------------------------- deploy

export type Deploy = {
  /** Runtime base: either an image or the output of a step. */
  base: ImageBase | StepBase;
  /** Layers copied onto the base. Only step inputs seen so far. */
  inputs: StepRefInput[];
  /** Optional is a guess; both samples had one. */
  startCommand?: string;
  variables?: Record<string, string>;
};

export type ImageBase = {
  image: string;
};

export type StepBase = {
  step: string;
};
