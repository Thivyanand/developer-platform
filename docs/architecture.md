# Architecture

## High-level model

Developer Platform
       |
       v
Project Brain
       |
       +-- Code Graph
       +-- Git Graph
       +-- Project Data
       |
       v
Intelligence Engine
       |
       +-- Search
       +-- Analysis
       +-- Context
       |
       v
Agent Layer
       |
       +-- Plan
       +-- Execute
       +-- Verify
       |
       v
Integrations
GitHub / CI / Cloud / IDE

## Initial architectural components

### Ingestion

Responsible for importing repository files, Git metadata, dependency manifests, configuration, and later external signals such as CI logs.

### Indexing

Build searchable representations of files, symbols, relationships, and project metadata.

### Project Graph

Represent relationships between files, symbols, modules, dependencies, commits, branches, and tests.

### Intelligence Engine

Answer project-level questions using deterministic analysis first and AI-assisted reasoning where appropriate.

### Agent Runtime

Provide controlled execution:

1. inspect
2. plan
3. propose
4. obtain approval
5. execute
6. test
7. report

### Integration Layer

Keep external providers behind stable interfaces so GitHub, GitLab, CI systems, cloud platforms, and IDEs can be added independently.

## Day 1 implementation foundation

### Runtime boundary

The platform is **TypeScript-first**. Node.js hosts the CLI, core orchestration, integrations, and most developer-facing logic. Python is an optional specialist runtime for workloads where its analysis/AI ecosystem provides a material advantage.

### Repository boundary

The first implementation will use a monorepo with explicit package boundaries:

```text
apps/
  cli/
packages/
  core/
  indexer/
  config/
  integrations/
docs/
```

This structure keeps the Project Brain domain model separate from repository indexing, configuration, and external adapters.

### Local data model

The first Project Brain implementation is local-first:

- SQLite for durable metadata
- filesystem-backed artifacts for source/index data
- Git as the source of truth for repository history
- provider APIs only for external signals

PostgreSQL remains a future option when hosted/team requirements justify it.

### Tooling

- pnpm workspaces for package management
- TypeScript for the primary language
- commander for the initial CLI
- GitHub Actions for CI

### Supported environments

The initial target is:

- Linux x64
- macOS x64/arm64
- Windows x64

Node.js 22 LTS is the baseline runtime.

## Design constraints

1. Core logic should remain provider-agnostic.
2. Evidence must remain attached to important intelligence results.
3. Destructive agent actions require approval by default.
4. Local operation should not require cloud infrastructure.
5. Interfaces should allow future IDE, CI/CD, cloud, and Git provider integrations.
6. Technology choices should be revisited when real implementation evidence contradicts them.
