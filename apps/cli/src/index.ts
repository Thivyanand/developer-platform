#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { createProject } from "@developer-platform/core";

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
      const project = createProject(
        process.cwd(),
        process.cwd().split("/").pop() ?? "project"
      );

      console.log(`Project: ${project.name}`);
      console.log(`Root: ${project.rootPath}`);
    });

  return program;
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  createCli().parse();
}
