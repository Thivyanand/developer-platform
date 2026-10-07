import test from "node:test";
import assert from "node:assert/strict";
import { githubIntegration } from "../dist/index.js";

test("defines the GitHub integration contract", () => {
  assert.deepEqual(githubIntegration, {
    id: "github",
    name: "GitHub"
  });
});
