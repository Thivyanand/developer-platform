#!/usr/bin/env node

import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { createProject } from "@developer-platform/core";
import { buildProjectGraph, scanRepository, searchRepository, searchCodeSymbols, validateProjectGraph } from "@developer-platform/indexer";

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
    .command("symbols <query>")
    .description("Search TypeScript/JavaScript declaration symbols")
    .option("-n, --limit <count>", "maximum number of results", "20")
    .action((query: string, options: { limit: string }) => {
      const limit = Number.parseInt(options.limit, 10);
      if (!Number.isInteger(limit) || limit < 1) {
        console.error("Symbol search limit must be a positive integer.");
        process.exitCode = 1;
        return;
      }

      const results = searchCodeSymbols(process.cwd(), query, { maxResults: limit });
      if (results.length === 0) {
        console.log("No symbols found.");
        return;
      }

      for (const result of results) {
        console.log(`${result.path}:${result.line}  ${result.kind} ${result.name}${result.exported ? " (exported)" : ""}`);
      }
      console.log(`\n${results.length} symbol(s)`);
    });

  projectCommand
    .command("graph")
    .description("Build a project relationship graph summary")
    .option("--json", "print the full graph as JSON")
    .option("--check", "validate graph node and edge integrity")
    .action((options: { json?: boolean; check?: boolean }) => {
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

      if (options.check) {
        const validation = validateProjectGraph(graph);
        console.log(`Graph validation: ${validation.valid ? "passed" : "failed"}`);
        for (const error of validation.errors) console.error("- " + error);
        if (!validation.valid) process.exitCode = 1;
      }
    });

  return program;
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  createCli().parse();
}
