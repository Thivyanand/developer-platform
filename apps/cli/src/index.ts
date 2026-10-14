#!/usr/bin/env node

import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { createProject } from "@developer-platform/core";
import { buildProjectGraph, scanRepository, searchRepository } from "@developer-platform/indexer";

export function createCli(): Command {
  const program = new Command();

  program
    .name("developer-platform")
    .description("An intelligence layer for the modern developer workflow.")
    .version("0.1.0");

  const projectCommand = program
    .command("project")
    .description("Inspect the current project")
    .action(() => {
      const rootPath = process.cwd();
      const project = createProject(rootPath, basename(rootPath) || "project");

      console.log(`Project: ${project.name}`);
      console.log(`Root: ${project.rootPath}`);
    });

  projectCommand
    .command("scan")
    .description("Scan the repository and report its project structure")
    .action(() => {
      const snapshot = scanRepository(process.cwd());

      console.log(`Files: ${snapshot.files.length}`);
      console.log(`Languages: ${snapshot.languages.join(", ") || "none detected"}`);
      console.log(`Frameworks: ${snapshot.frameworks.join(", ") || "none detected"}`);
    });

  projectCommand
    .command("search <query>")
    .description("Search repository source files")
    .option("-n, --limit <count>", "maximum number of results", "20")
    .action((query: string, options: { limit: string }) => {
      const limit = Number.parseInt(options.limit, 10);
      if (!Number.isInteger(limit) || limit < 1) {
        console.error("Search limit must be a positive integer.");
        process.exitCode = 1;
        return;
      }

      const results = searchRepository(process.cwd(), query, { maxResults: limit });
      if (results.length === 0) {
        console.log("No matches found.");
        return;
      }

      for (const result of results) {
        console.log(`${result.path}:${result.line}  ${result.snippet}`);
      }
      console.log(`\n${results.length} match(es)`);
    });

  projectCommand
    .command("graph")
    .description("Build a project relationship graph summary")
    .option("--json", "print the full graph as JSON")
    .action((options: { json?: boolean }) => {
      const graph = buildProjectGraph(scanRepository(process.cwd()));
      if (options.json) {
        console.log(JSON.stringify(graph, null, 2));
        return;
      }

      const counts = graph.nodes.reduce<Record<string, number>>((result, node) => {
        result[node.type] = (result[node.type] ?? 0) + 1;
        return result;
      }, {});
      console.log(`Nodes: ${graph.nodes.length}`);
      console.log(`Edges: ${graph.edges.length}`);
      console.log("Node types: " + Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
        .map(([type, count]) => `${type}=${count}`).join(", "));
    });

  return program;
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  createCli().parse();
}
