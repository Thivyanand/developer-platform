import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { describeFile, readGitMetadata, scanRepository, searchRepository, tokenizeCode } from "../dist/index.js";

function git(root, ...args) {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function initGitRepository() {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-git-"));
  git(root, "init", "-q");
  git(root, "config", "user.name", "Test User");
  git(root, "config", "user.email", "test@example.com");
  return root;
}

test("describes a file extension", () => {
  assert.deepEqual(describeFile("src/index.ts"), { path: "src/index.ts", extension: "ts" });
});

test("handles files without an extension", () => {
  assert.deepEqual(describeFile("README"), { path: "README", extension: "" });
});

test("scans repository files and ignores generated directories", () => {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "node_modules"));
  mkdirSync(join(root, "dist"));

  writeFileSync(join(root, "src", "main.ts"), "export {}");
  writeFileSync(join(root, "README.md"), "# demo");
  writeFileSync(join(root, "node_modules", "ignored.js"), "");
  writeFileSync(join(root, "dist", "ignored.js"), "");

  const snapshot = scanRepository(root);

  assert.deepEqual(snapshot.files.map((file) => file.path), ["README.md", "src/main.ts"]);
  assert.deepEqual(snapshot.languages, ["TypeScript"]);
  assert.equal(snapshot.git, null);
});

test("detects frameworks from package.json and project files", () => {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-"));

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { next: "^16.0.0", react: "^19.0.0" } })
  );
  writeFileSync(join(root, "app.tsx"), "export {}");

  const snapshot = scanRepository(root);

  assert.deepEqual(snapshot.frameworks, ["Next.js", "React"]);
  assert.deepEqual(snapshot.languages, ["JSON", "TypeScript"]);
});

test("reads commit and branch metadata from a git repository", () => {
  const root = initGitRepository();

  writeFileSync(join(root, "README.md"), "# first");
  git(root, "add", "README.md");
  git(root, "commit", "-q", "-m", "initial commit");

  writeFileSync(join(root, "README.md"), "# second");
  git(root, "add", "README.md");
  git(root, "commit", "-q", "-m", "second commit");

  git(root, "branch", "feature/history");

  const metadata = readGitMetadata(root);

  assert.ok(metadata);
  assert.equal(metadata.commits.length, 2);
  assert.equal(metadata.commits[0].subject, "second commit");
  assert.equal(metadata.commits[0].parents.length, 1);
  assert.equal(metadata.commits[1].subject, "initial commit");
  assert.equal(metadata.currentBranch, "master");
  assert.equal(metadata.branches.some((branch) => branch.name === "master" && branch.current), true);
  assert.equal(metadata.branches.some((branch) => branch.name === "feature/history"), true);

  const snapshot = scanRepository(root);
  assert.equal(snapshot.git?.head, metadata.head);
});

test("returns only the requested number of commits", () => {
  const root = initGitRepository();

  writeFileSync(join(root, "README.md"), "# first");
  git(root, "add", "README.md");
  git(root, "commit", "-q", "-m", "initial commit");

  writeFileSync(join(root, "README.md"), "# second");
  git(root, "add", "README.md");
  git(root, "commit", "-q", "-m", "second commit");

  assert.equal(readGitMetadata(root, 1)?.commits.length, 1);
});

test("rejects a non-directory repository root", () => {
  const file = join(tmpdir(), "developer-platform-file");
  writeFileSync(file, "not a directory");
  assert.throws(() => scanRepository(file), /Repository root is not a directory/);
});


test("tokenizes camelCase identifiers and punctuation", () => {
  assert.deepEqual(tokenizeCode("readGitMetadata"), ["read", "git", "metadata"]);
});

test("searches source files with ranked line-numbered results", () => {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-search-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "metadata.ts"), "export function readGitMetadata() {}\nconst git = true;\n");
  writeFileSync(join(root, "README.md"), "Metadata helps explain the repository.\n");
  writeFileSync(join(root, "image.bin"), Buffer.from([0, 1, 2, 3]));

  const results = searchRepository(root, "git metadata");
  assert.ok(results.length >= 2);
  assert.equal(results[0].path, "src/metadata.ts");
  assert.equal(results[0].line, 1);
  assert.match(results[0].snippet, /readGitMetadata/);
  assert.equal(results.every((result) => result.path !== "image.bin"), true);
});

test("returns no results for empty queries and honors result limits", () => {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-search-"));
  writeFileSync(join(root, "a.ts"), "const search = 1;\nconst searchAgain = 2;");
  assert.deepEqual(searchRepository(root, "!!!"), []);
  assert.equal(searchRepository(root, "search", { maxResults: 1 }).length, 1);
});

test("skips oversized files and validates search options", () => {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-search-"));
  writeFileSync(join(root, "large.ts"), "search ".repeat(100));
  assert.deepEqual(searchRepository(root, "search", { maxFileBytes: 10 }), []);
  assert.throws(() => searchRepository(root, "search", { maxResults: 0 }), /maxResults/);
});


test("builds a deterministic project graph from repository metadata", async () => {
  const { buildProjectGraph } = await import("../dist/index.js");
  const root = mkdtempSync(join(tmpdir(), "developer-platform-graph-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "main.ts"), "export const answer = 42;");
  writeFileSync(join(root, "README.md"), "# graph");
  writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }));

  const snapshot = scanRepository(root);
  const graph = buildProjectGraph(snapshot);
  const secondGraph = buildProjectGraph(snapshot);

  assert.deepEqual(graph, secondGraph);
  assert.ok(graph.nodes.some((node) => node.id === "project:root" && node.type === "project"));
  assert.ok(graph.nodes.some((node) => node.id === "file:src/main.ts"));
  assert.ok(graph.nodes.some((node) => node.id === "language:TypeScript"));
  assert.ok(graph.nodes.some((node) => node.id === "framework:React"));
  assert.ok(graph.edges.some((edge) => edge.source === "project:root" && edge.target === "file:src/main.ts" && edge.type === "contains"));
  assert.ok(graph.edges.every((edge) =>
    graph.nodes.some((node) => node.id === edge.source) &&
    graph.nodes.some((node) => node.id === edge.target)
  ));
});

test("includes git commits and branch tip relationships in the project graph", async () => {
  const { buildProjectGraph } = await import("../dist/index.js");
  const root = initGitRepository();
  writeFileSync(join(root, "index.ts"), "export {};");
  git(root, "add", "index.ts");
  git(root, "commit", "-q", "-m", "graph fixture");
  git(root, "branch", "feature/graph");

  const graph = buildProjectGraph(scanRepository(root));
  assert.ok(graph.nodes.some((node) => node.type === "commit" && node.label === "graph fixture"));
  assert.ok(graph.nodes.some((node) => node.type === "branch" && node.label === "master (current)"));
  assert.ok(graph.edges.some((edge) => edge.type === "points-to" && edge.source === "branch:feature/graph"));
});


test("adds edges for resolvable relative source imports", async () => {
  const { buildProjectGraph } = await import("../dist/index.js");
  const root = mkdtempSync(join(tmpdir(), "developer-platform-import-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "main.ts"), 'import { helper } from "./util";\\nexport const result = helper();');
  writeFileSync(join(root, "src", "util.ts"), "export function helper() { return 42; }");
  writeFileSync(join(root, "src", "external.ts"), 'import express from "express";');

  const graph = buildProjectGraph(scanRepository(root));
  assert.ok(graph.edges.some((edge) =>
    edge.source === "file:src/main.ts" &&
    edge.target === "file:src/util.ts" &&
    edge.type === "imports"
  ));
  assert.equal(graph.edges.some((edge) => edge.source === "file:src/external.ts" && edge.type === "imports"), false);
});


test("adds package dependency nodes and deduplicates graph edges", async () => {
  const { buildProjectGraph } = await import("../dist/index.js");
  const root = mkdtempSync(join(tmpdir(), "developer-platform-dependencies-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "package.json"), JSON.stringify({
    dependencies: { react: "^19.0.0", zod: "^4.0.0" },
    devDependencies: { vite: "^7.0.0", react: "^19.0.0" }
  }));
  writeFileSync(join(root, "src", "main.ts"), [
    'import "./setup";',
    'import("./setup");',
    'import { setup } from "./setup";',
    "export { setup };"
  ].join("\\n"));
  writeFileSync(join(root, "src", "setup.ts"), "export const setup = true;");

  const graph = buildProjectGraph(scanRepository(root));
  assert.ok(graph.nodes.some((node) => node.id === "package:react" && node.type === "package"));
  assert.ok(graph.nodes.some((node) => node.id === "package:zod" && node.type === "package"));
  assert.ok(graph.nodes.some((node) => node.id === "package:vite" && node.type === "package"));
  assert.equal(graph.nodes.filter((node) => node.id === "package:react").length, 1);
  assert.equal(graph.edges.filter((edge) =>
    edge.source === "project:root" && edge.target === "package:react" && edge.type === "depends-on"
  ).length, 1);
  assert.equal(graph.edges.filter((edge) =>
    edge.source === "file:src/main.ts" && edge.target === "file:src/setup.ts" && edge.type === "imports"
  ).length, 1);
});


test("validates graph edges and reports dangling or duplicate relationships", async () => {
  const { buildProjectGraph, validateProjectGraph } = await import("../dist/index.js");
  const root = mkdtempSync(join(tmpdir(), "developer-platform-graph-validation-"));
  writeFileSync(join(root, "index.ts"), "export const value = 1;");
  const graph = buildProjectGraph(scanRepository(root));

  assert.deepEqual(validateProjectGraph(graph), { valid: true, errors: [] });

  const invalidGraph = {
    nodes: [...graph.nodes, graph.nodes[0]],
    edges: [
      ...graph.edges,
      { source: "missing:source", target: "missing:target", type: "imports" },
      ...graph.edges.slice(0, 1)
    ]
  };
  const validation = validateProjectGraph(invalidGraph);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.startsWith("Duplicate node id:")));
  assert.ok(validation.errors.some((error) => error.startsWith("Missing edge source:")));
  assert.ok(validation.errors.some((error) => error.startsWith("Missing edge target:")));
  assert.ok(validation.errors.some((error) => error.startsWith("Duplicate edge:")));
});

test("extracts exported code symbols with source locations", async () => {
  const { extractCodeSymbols } = await import("../dist/index.js");
  const symbols = extractCodeSymbols("export function greet() {}\nclass Worker {}\nexport const start = () => {};", "src/app.ts");
  assert.deepEqual(symbols, [
    { name: "greet", kind: "function", path: "src/app.ts", line: 1, exported: true },
    { name: "Worker", kind: "class", path: "src/app.ts", line: 2, exported: false },
    { name: "start", kind: "variable", path: "src/app.ts", line: 3, exported: true }
  ]);
});

test("searches symbol names and kinds across source files", async () => {
  const { searchCodeSymbols } = await import("../dist/index.js");
  const root = mkdtempSync(join(tmpdir(), "developer-platform-symbol-search-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "worker.ts"), "export class Worker {}\nexport function startWorker() {}");
  writeFileSync(join(root, "src", "other.js"), "const unrelated = 1;");
  const results = searchCodeSymbols(root, "worker");
  assert.deepEqual(results.map(({ name, path }) => ({ name, path })), [
    { name: "Worker", path: "src/worker.ts" },
    { name: "startWorker", path: "src/worker.ts" }
  ]);
  assert.throws(() => searchCodeSymbols(root, "worker", { maxResults: 0 }), /maxResults/);
});

test("connects discovered code symbols to their source files in the project graph", async () => {
  const { buildProjectGraph, validateProjectGraph } = await import("../dist/index.js");
  const root = mkdtempSync(join(tmpdir(), "developer-platform-symbol-graph-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "worker.ts"), "export class Worker {}\nexport function startWorker() {}");
  const graph = buildProjectGraph(scanRepository(root));

  assert.ok(graph.nodes.some((node) => node.id === "symbol:src/worker.ts:class:Worker" && node.type === "symbol"));
  assert.ok(graph.nodes.some((node) => node.id === "symbol:src/worker.ts:function:startWorker" && node.type === "symbol"));
  assert.ok(graph.edges.some((edge) => edge.source === "file:src/worker.ts" && edge.target === "symbol:src/worker.ts:class:Worker" && edge.type === "defines-symbol"));
  assert.deepEqual(validateProjectGraph(graph), { valid: true, errors: [] });
});

test("extracts non-exported async function declarations", async () => {
  const { extractCodeSymbols } = await import("../dist/index.js");
  assert.deepEqual(extractCodeSymbols("async function refreshCache() {}\nexport async function loadData() {}", "src/cache.ts"), [
    { name: "refreshCache", kind: "function", path: "src/cache.ts", line: 1, exported: false },
    { name: "loadData", kind: "function", path: "src/cache.ts", line: 2, exported: true }
  ]);
});

test("extracts declarations whose export modifiers span multiple lines", async () => {
  const { extractCodeSymbols } = await import("../dist/index.js");
  const source = [
    "export",
    "async function refreshData() {}",
    "export default",
    "class DataStore {}"
  ].join("\\n");
  assert.deepEqual(extractCodeSymbols(source, "src/data.ts"), [
    { name: "refreshData", kind: "function", path: "src/data.ts", line: 1, exported: true },
    { name: "DataStore", kind: "class", path: "src/data.ts", line: 3, exported: true }
  ]);
});
