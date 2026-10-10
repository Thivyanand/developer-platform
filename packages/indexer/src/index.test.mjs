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
