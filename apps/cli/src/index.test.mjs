import test from "node:test";
import assert from "node:assert/strict";
import { createCli } from "../dist/index.js";

test("creates the CLI with project command", () => {
  const cli = createCli();

  assert.equal(cli.name(), "developer-platform");
  assert.equal(cli.version(), "0.1.0");
  assert.equal(cli.commands.some((command) => command.name() === "project"), true);
});

test("exposes the project scan command", () => {
  const cli = createCli();
  const project = cli.commands.find((command) => command.name() === "project");

  assert.equal(
    project?.commands.some((command) => command.name() === "scan"),
    true
  );
});
