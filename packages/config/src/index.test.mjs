import test from "node:test";
import assert from "node:assert/strict";
import { defaultConfig } from "../dist/index.js";

test("creates local-first default configuration", () => {
  assert.deepEqual(defaultConfig("/workspace/demo"), {
    projectRoot: "/workspace/demo",
    dataDirectory: ".developer-platform"
  });
});
