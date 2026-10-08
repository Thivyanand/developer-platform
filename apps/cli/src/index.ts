#!/usr/bin/env node

import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { createProject } from "@developer-platform/core";
import { scanRepository } from "@developer-platform/indexer";

export function createCli(): Command {
  const program = new Command();

  program
    .name("developer-platform")
    .description("An intelligence layer for the modern developer workflow.")
    .version("0.1.0");

  program
    .command("project")
    .description("Inspect the current project")
    .action(() => {
      const rootPath = process.cwd();
      const project = createProject(rootPath, basename(rootPath) || "project");

      console.log(`Project: ${project.name}`);
      console.log(`Root: ${project.rootPath}`);
    })
    .command("scan")
    .description("Scan the repository and report its project structure")
    .action(() => {
      const snapshot = scanRepository(process.cwd());

      console.log(`Files: ${snapshot.files.length}`);
      console.log(`Languages: ${snapshot.languages.join(", ") || "none detected"}`);
      console.log(`Frameworks: ${snapshot.frameworks.join(", ") || "none detected"}`);
    });

  return program;
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  createCli().parse();
}
