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
