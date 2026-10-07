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

## Day 2 foundation

The runtime scaffold is now a pnpm monorepo:

    apps/
      cli/                 # User-facing command line interface

    packages/
      core/                # Project Brain domain primitives
      config/              # Platform configuration
      indexer/             # Repository indexing primitives
      integrations/        # External provider contracts

The initial runtime uses **TypeScript + Node.js 22 LTS**, with Commander powering the CLI. The repository has a GitHub Actions pipeline for typechecking, building, and testing the workspace.

The public product name remains intentionally open while development continues.

## Status

🚧 Early development — Day 2 runtime foundation.

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

## Development principle

Every meaningful development session should produce a tested, reviewable GitHub change.
