# Architecture Decision Log

## ADR-0001 — Project Brain as the core abstraction

**Status:** Accepted

The platform will treat the Project Brain as the central abstraction connecting repository structure, Git history, dependencies, tests, and external development signals.

### Why

Developer problems frequently cross subsystem boundaries. A project-level representation lets future debugging and agent features reason across those boundaries instead of treating each tool independently.

## ADR-0002 — Evidence-backed intelligence

**Status:** Accepted

The intelligence layer must preserve evidence for important conclusions.

### Why

A useful developer system must distinguish observed facts from AI-generated hypotheses. This improves trust, debugging quality, and safe automation.

## ADR-0003 — Approval before destructive actions

**Status:** Accepted

Agent actions that can materially modify source code, infrastructure, or data require explicit approval by default.

### Why

The platform is intended to help developers move faster without turning automation into an uncontrolled source of damage.

## ADR-0004 — TypeScript-first developer platform

**Status:** Accepted

The core developer-facing runtime, CLI, orchestration interfaces, and integrations will use TypeScript/Node.js. Python is reserved for analysis or AI workloads where its ecosystem provides a clear advantage.

### Why

The product needs a strong developer-tooling ecosystem, cross-platform CLI support, typed interfaces, and straightforward integration with GitHub and web tooling. A TypeScript-first boundary also prevents premature duplication between multiple runtimes.

## ADR-0005 — Monorepo with explicit package boundaries

**Status:** Accepted

The repository will use a monorepo structure with independently testable packages/apps rather than a single large application.

Initial boundary:

- `apps/cli` — user-facing CLI
- `packages/core` — Project Brain domain model and orchestration contracts
- `packages/indexer` — repository/file/indexing primitives
- `packages/config` — configuration and environment handling
- `packages/integrations` — external provider interfaces and adapters

The boundaries are intentionally small and can evolve as real dependencies appear.

## ADR-0006 — SQLite-first local storage and filesystem-backed indexes

**Status:** Accepted

The first local implementation will use SQLite for durable project metadata and the local filesystem for source/index artifacts. A server database such as PostgreSQL will be introduced only when multi-user/cloud requirements justify it.

### Why

The initial product must work locally with minimal setup, remain fast for single-project development, and avoid forcing users to run infrastructure before the Project Brain can understand a repository.

## ADR-0007 — CLI and package tooling

**Status:** Accepted

The CLI will use `commander`, the repository will use `pnpm` workspaces, and TypeScript will provide the primary build/type-checking layer.

### Why

These choices keep the first implementation lightweight while giving us clear command composition, reproducible dependency management, and strong typing.

## ADR-0008 — Supported environments

**Status:** Accepted

The first supported development environments are:

- Linux x64
- macOS x64/arm64
- Windows x64

Node.js 22 LTS is the baseline runtime. The platform should avoid OS-specific assumptions in the core packages.

### Why

These cover the dominant developer environments while keeping the first release surface manageable.

## ADR-0009 — CI baseline

**Status:** Accepted

GitHub Actions will run on pushes and pull requests to `main`. The initial baseline validates repository structure; package build, type-check, lint, and test jobs will be added as the runtime scaffold lands.

### Why

CI should exist from the beginning without pretending the project has code-quality commands that do not exist yet.
