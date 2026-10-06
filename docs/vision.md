# Product Vision

## The problem

Modern development is fragmented across source code and IDEs, Git and pull requests, terminals and local errors, package managers and dependencies, CI/CD systems, cloud infrastructure, logs and monitoring, documentation, and team knowledge.

When something goes wrong, developers manually connect these pieces.

## The opportunity

Build a persistent **Project Brain** that understands the relationships between these systems.

A developer should be able to ask:

> Why is my application broken?

and receive an evidence-backed investigation instead of a generic suggestion.

The platform should correlate:

change → build → test → deployment → logs → failure

and explain the most likely root cause.

## Product principles

### Evidence before confidence

The system should distinguish facts, hypotheses, and recommendations.

### Safe by default

Actions that modify code, infrastructure, or data require explicit approval unless the user has configured otherwise.

### Understand before acting

The agent should inspect project conventions and existing architecture before proposing changes.

### Local-first where possible

Private source code should not have to leave the developer's environment for core indexing and analysis.

### Tool-agnostic

The platform should work with different languages, frameworks, Git providers, CI systems, and cloud providers.

### Explainable automation

Every important automated decision should have a useful explanation and supporting evidence.

## Long-term destination

The end state is a **developer operating layer**:

- understand a project
- investigate failures
- propose fixes
- verify fixes
- monitor health
- automate repetitive engineering work

The product should become more useful as it learns the structure and history of a project, without becoming dependent on a single editor, Git provider, or AI model.
