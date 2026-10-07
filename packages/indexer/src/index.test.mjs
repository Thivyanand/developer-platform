import test from "node:test";
import assert from "node:assert/strict";
import { describeFile } from "../dist/index.js";

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
