# Repository Ingestion

Day 3 establishes the first concrete input to the Project Brain: a deterministic snapshot of a repository.

## Snapshot contract

The indexer returns:

- rootPath — absolute repository root supplied by the caller.
- files — sorted repository-relative file paths with normalized extensions.
- languages — unique detected languages.
- frameworks — unique detected frameworks and platform markers.
- git — Git history metadata when the repository is inside a Git work tree.

This contract intentionally contains metadata only. It does not parse source code yet; symbol and semantic indexing belongs to Day 5 and the Intelligence Engine.

## Discovery rules

The scanner recursively walks the repository and skips directories that are normally generated, dependency-owned, or internal to the platform:

- .git
- .developer-platform
- node_modules
- dist
- build
- coverage
- .next
- .turbo
- target
- __pycache__

Files are returned in lexical order so repeated scans produce stable results.

## Detection

Language detection is extension-based for the first ingestion layer.

Framework detection currently combines:
- Node.js dependencies and devDependencies from package.json;
- Python project markers such as manage.py, requirements.txt, and pyproject.toml;
- Rust Cargo.toml;
- Go go.mod;
- JVM build descriptors.

Detection is deliberately conservative. Later Project Brain stages can enrich these signals with configuration parsing, AST analysis, dependency graphs, and Git history.

## Git metadata

Day 4 adds a bounded Git metadata layer to the repository snapshot:

- HEAD commit hash;
- current branch;
- recent commits with hash, subject, author, authored timestamp, and parent hashes;
- local branch names and their tip commits.

The commit history is bounded to 50 commits by default so scanning a large repository does not accidentally load its entire history. Callers can request a different limit through readGitMetadata(rootPath, commitLimit).

Non-Git directories remain valid scan targets; their git field is null.

## CLI

The ingestion layer is exposed through:

    developer-platform project scan

The command reports file count, detected languages, and detected frameworks without mutating the repository.


## Day 5 — Initial code search

The first code-search pass reads repository text files on demand and returns ranked line matches. It is intentionally lightweight and does not persist source contents.

- Identifiers are split across camelCase/PascalCase boundaries and punctuation.
- Exact token matches score above partial-token matches.
- Results include repository-relative path, one-based line number, a short snippet, and score.
- Binary files are skipped; files larger than 512 KiB are skipped by default.
- Results are deterministic, with ties ordered by path and line.
- The default result limit is 20 and can be configured by callers.

Run search from the repository root:

    developer-platform project search "git metadata"
    developer-platform project search "readGitMetadata" --limit 5

This is a first retrieval baseline, not yet a persistent index or semantic search engine. Symbol-aware parsing and dependency relationships remain future work.
