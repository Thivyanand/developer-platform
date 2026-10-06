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

## Day 1 foundation

The initial implementation direction is now locked:

- TypeScript/Node.js 22 LTS for the core developer runtime
- pnpm workspaces for the monorepo
- commander for the CLI
- SQLite + filesystem-backed local project data
- GitHub Actions for CI
- Linux, macOS, and Windows as initial targets

The public product name remains intentionally open until the final naming decision is made.

## Status

🚧 Early development — Day 1 foundation.

See docs/vision.md, docs/architecture.md, docs/roadmap.md, and docs/DECISIONS.md.

## Development principle

Every meaningful development session should produce a tested, reviewable GitHub change.
