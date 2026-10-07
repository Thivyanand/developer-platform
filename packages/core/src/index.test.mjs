import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "../dist/index.js";

test("creates a project identity", () => {
  assert.deepEqual(
    createProject("/workspace/demo", "demo"),
    { rootPath: "/workspace/demo", name: "demo" }
  );
});

test("preserves an explicit project name", () => {
  assert.equal(createProject("/workspace/demo", "custom").name, "custom");
});
