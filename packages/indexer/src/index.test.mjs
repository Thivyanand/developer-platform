import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { describeFile, scanRepository } from "../dist/index.js";

test("describes a file extension", () => {
  assert.deepEqual(describeFile("src/index.ts"), {
    path: "src/index.ts",
    extension: "ts"
  });
});

test("handles files without an extension", () => {
  assert.deepEqual(describeFile("README"), {
    path: "README",
    extension: ""
  });
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
});

test("detects frameworks from package.json and project files", () => {
  const root = mkdtempSync(join(tmpdir(), "developer-platform-"));

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: {
        next: "^16.0.0",
        react: "^19.0.0"
      }
    })
  );
  writeFileSync(join(root, "app.tsx"), "export {}");

  const snapshot = scanRepository(root);

  assert.deepEqual(snapshot.frameworks, ["Next.js", "React"]);
  assert.deepEqual(snapshot.languages, ["TypeScript"]);
});


test("rejects a non-directory repository root", () => {
  const file = join(tmpdir(), "developer-platform-file");
  writeFileSync(file, "not a directory");

  assert.throws(() => scanRepository(file), /Repository root is not a directory/);
});
