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

## Initial technology direction

The exact stack is deliberately not frozen yet.

Day 1 will establish the architecture and evaluate the implementation stack before the first production subsystem is built.

Candidate areas include TypeScript for developer-facing tooling and integrations, Python for analysis or AI workloads where it provides a clear advantage, PostgreSQL for durable project metadata, and GitHub Actions for CI.

The stack should follow the product's requirements rather than the other way around.
