# Developer Platform

> An intelligence layer for the modern developer workflow.

This repository contains the foundation for a developer platform designed to understand a project end-to-end and help developers **understand, debug, test, secure, and operate** their software.

## Vision

Developers work across code, Git, terminals, CI/CD, cloud platforms, dependencies, logs, and documentation. The platform we are building will connect those pieces through a persistent **Project Brain**.

The long-term goal is not another coding chatbot. It is a developer system that can investigate problems across the whole project, explain what it found, propose safe actions, and eventually execute approved work.

## Core pillars

- **Project Intelligence** — understand repositories, architecture, dependencies, symbols, and relationships.
- **Debugging Intelligence** — connect errors, logs, code changes, tests, and deployments.
- **Developer Tools** — testing, security, dependency health, code health, and risk analysis.
- **Agent** — plan and execute approved development tasks with verification.
- **Integrations** — GitHub first, followed by IDEs, CI/CD, and cloud platforms.

## Day 3 — Repository ingestion

The first Project Brain ingestion layer is now implemented.

The indexer can:
- recursively discover repository files;
- ignore Git metadata and generated/dependency directories;
- normalize file extensions;
- detect common programming and markup languages;
- detect frameworks from Node.js dependencies and project markers;
- expose the scan through the CLI with `project scan`.

The scan produces a deterministic `RepositorySnapshot` containing the repository root, discovered files, languages, and frameworks.

## Day 5 — Initial code search

The first code-search baseline is implemented. Search tokenizes camelCase identifiers, ranks exact token matches above partial matches, and returns file paths, line numbers, and snippets. Binary files and files larger than 512 KiB are skipped by default.

Run `project search "git metadata"` from a repository root. Use `--limit 5` to cap results.

## Status

🚧 Early development — repository ingestion and initial code search.

See docs/vision.md, docs/architecture.md, docs/roadmap.md, and docs/DECISIONS.md.

## Development

Install dependencies:

    pnpm install

Run the checks:

    pnpm typecheck
    pnpm build
    pnpm test

Run the CLI after building:

    pnpm --filter @developer-platform/cli exec developer-platform --help
    pnpm --filter @developer-platform/cli exec developer-platform project
    pnpm --filter @developer-platform/cli exec developer-platform project scan
    pnpm --filter @developer-platform/cli exec developer-platform project search "git metadata"

The public product name remains intentionally open while development continues.

## Development principle

Every meaningful development session should produce a tested, reviewable GitHub change.
