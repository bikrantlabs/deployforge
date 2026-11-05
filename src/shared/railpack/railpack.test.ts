import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandRunner } from "../utils/command-runner.js";
import { Railpack } from "./railpack.js";

describe("Railpack image builds", () => {
  let workspace: string;
  let args: string[];
  let runner: CommandRunner;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(os.tmpdir(), "deployforge-railpack-"));
    args = [];
    runner = {
      run: vi.fn(async (_command, commandArgs) => {
        args = commandArgs;
        return { exitCode: 0, stdout: "", stderr: "" };
      }),
    };
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it("prunes dev dependencies by default without changing the image reference", async () => {
    await new Railpack(runner).build(
      workspace,
      { name: "deployforge_project:deployment", envVariables: {} },
      () => {},
    );

    expect(args).toContain("--name");
    expect(args[args.indexOf("--name") + 1]).toBe(
      "deployforge_project:deployment",
    );
    expect(args).toContain("RAILPACK_PRUNE_DEPS=true");
  });

  it("allows projects to keep dev dependencies", async () => {
    await new Railpack(runner).build(
      workspace,
      {
        name: "deployforge_project:deployment",
        envVariables: {},
        pruneDevDependencies: false,
      },
      () => {},
    );

    expect(args).toContain("RAILPACK_PRUNE_DEPS=false");
  });
});
