import test from "node:test";
import assert from "node:assert/strict";
import { createCli } from "../dist/index.js";

test("creates the CLI with project command", () => {
  const cli = createCli();

  assert.equal(cli.name(), "developer-platform");
  assert.equal(cli.version(), "0.1.0");
  assert.equal(cli.commands.some((command) => command.name() === "project"), true);
});

test("exposes scan, search, and graph as sibling project commands", () => {
  const cli = createCli();
  const project = cli.commands.find((command) => command.name() === "project");
  const childNames = project?.commands.map((command) => command.name());

  assert.deepEqual(childNames, ["scan", "search", "symbols", "graph"]);
  assert.equal(project?.commands.some((command) => command.commands.length > 0), false);
});

test("graph command supports JSON output", () => {
  const cli = createCli();
  const project = cli.commands.find((command) => command.name() === "project");
  const graph = project?.commands.find((command) => command.name() === "graph");

  assert.equal(graph?.options.some((option) => option.long === "--json"), true);
  assert.equal(graph?.options.some((option) => option.long === "--check"), true);
});

test("symbols command supports a configurable result limit", () => {
  const cli = createCli();
  const project = cli.commands.find((command) => command.name() === "project");
  const symbols = project?.commands.find((command) => command.name() === "symbols");
  assert.ok(symbols);
  assert.equal(symbols?.options.some((option) => option.long === "--limit"), true);
});
