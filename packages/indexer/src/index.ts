import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, posix } from "node:path";

export interface RepositoryFile {
  path: string;
  extension: string;
}

export interface GitCommit {
  hash: string;
  subject: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  parents: string[];
}

export interface GitBranch {
  name: string;
  commit: string;
  current: boolean;
}

export interface GitMetadata {
  head: string;
  currentBranch: string | null;
  commits: GitCommit[];
  branches: GitBranch[];
}

export interface RepositorySnapshot {
  rootPath: string;
  files: RepositoryFile[];
  languages: string[];
  frameworks: string[];
  git: GitMetadata | null;
}

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  ".developer-platform",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "target",
  "__pycache__"
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".c": "C",
  ".cc": "C++",
  ".cpp": "C++",
  ".cs": "C#",
  ".go": "Go",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".kt": "Kotlin",
  ".php": "PHP",
  ".py": "Python",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".swift": "Swift",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".vue": "Vue",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML"
};

const FRAMEWORK_BY_DEPENDENCY: Record<string, string> = {
  "@angular/core": "Angular",
  "express": "Express",
  "fastify": "Fastify",
  "next": "Next.js",
  "nuxt": "Nuxt",
  "react": "React",
  "svelte": "Svelte",
  "vue": "Vue",
  "nestjs": "NestJS"
};

function runGit(rootPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: rootPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function readGitCommits(rootPath: string, limit: number): GitCommit[] {
  const recordSeparator = "\x1e";
  const fieldSeparator = "\x1f";
  const format = ["%H", "%s", "%an", "%ae", "%aI", "%P"].join(fieldSeparator);

  const output = runGit(rootPath, [
    "log",
    "-n",
    String(limit),
    "--pretty=format:" + recordSeparator + format
  ]);

  return output
    .split(recordSeparator)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, authorName, authorEmail, authoredAt, parents = ""] =
        record.split(fieldSeparator);

      return {
        hash,
        subject,
        authorName,
        authorEmail,
        authoredAt,
        parents: parents ? parents.split(" ") : []
      };
    });
}

function readGitBranches(rootPath: string): GitBranch[] {
  const fieldSeparator = "\x1f";
  const output = runGit(rootPath, [
    "for-each-ref",
    "--format=%(refname:short)" + fieldSeparator + "%(objectname)" + fieldSeparator + "%(HEAD)",
    "refs/heads"
  ]);

  return output
    ? output.split("\n").map((line) => {
        const [name, commit, headMarker] = line.split(fieldSeparator);
        return { name, commit, current: headMarker === "*" };
      })
    : [];
}

export function readGitMetadata(rootPath: string, commitLimit = 50): GitMetadata | null {
  try {
    if (runGit(rootPath, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
      return null;
    }

    return {
      head: runGit(rootPath, ["rev-parse", "HEAD"]),
      currentBranch: runGit(rootPath, ["branch", "--show-current"]) || null,
      commits: readGitCommits(rootPath, commitLimit),
      branches: readGitBranches(rootPath)
    };
  } catch {
    return null;
  }
}

function discoverFiles(rootPath: string, currentPath = rootPath): RepositoryFile[] {
  const entries = readdirSync(currentPath, { withFileTypes: true });
  const files: RepositoryFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) continue;

    const absolutePath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...discoverFiles(rootPath, absolutePath));
      continue;
    }

    if (!entry.isFile()) continue;

    files.push({
      path: relative(rootPath, absolutePath),
      extension: extname(entry.name).slice(1).toLowerCase()
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function detectLanguages(files: RepositoryFile[]): string[] {
  return [...new Set(
    files
      .map((file) => LANGUAGE_BY_EXTENSION[file.extension ? "." + file.extension : ""])
      .filter((language): language is string => Boolean(language))
  )].sort();
}

function detectNodeFrameworks(rootPath: string): string[] {
  const packageJsonPath = join(rootPath, "package.json");

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    return Object.keys(FRAMEWORK_BY_DEPENDENCY)
      .filter((dependency) => dependency in dependencies)
      .map((dependency) => FRAMEWORK_BY_DEPENDENCY[dependency])
      .sort();
  } catch {
    return [];
  }
}

function detectFrameworks(rootPath: string, files: RepositoryFile[]): string[] {
  const frameworks = new Set(detectNodeFrameworks(rootPath));
  const paths = new Set(files.map((file) => file.path));

  if (paths.has("manage.py")) frameworks.add("Django");
  if (paths.has("requirements.txt") || paths.has("pyproject.toml")) {
    if (files.some((file) => file.path.endsWith(".py"))) frameworks.add("Python");
  }
  if (paths.has("Cargo.toml")) frameworks.add("Rust");
  if (paths.has("go.mod")) frameworks.add("Go");
  if (paths.has("pom.xml") || paths.has("build.gradle") || paths.has("build.gradle.kts")) {
    frameworks.add("JVM");
  }

  return [...frameworks].sort();
}

export function describeFile(path: string): RepositoryFile {
  return {
    path,
    extension: extname(basename(path)).slice(1).toLowerCase()
  };
}

export function scanRepository(rootPath: string): RepositorySnapshot {
  const root = statSync(rootPath);

  if (!root.isDirectory()) {
    throw new Error("Repository root is not a directory: " + rootPath);
  }

  const files = discoverFiles(rootPath);

  return {
    rootPath,
    files,
    languages: detectLanguages(files),
    frameworks: detectFrameworks(rootPath, files),
    git: readGitMetadata(rootPath)
  };
}


export interface CodeSearchResult {
  path: string;
  line: number;
  snippet: string;
  score: number;
}

export interface CodeSearchOptions {
  maxFileBytes?: number;
  maxResults?: number;
}

/** Split camelCase, PascalCase, and punctuation into searchable lowercase terms. */
export function tokenizeCode(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/**
 * Search repository text files without persisting source contents.
 * Binary files and files larger than maxFileBytes are skipped.
 */
export function searchRepository(
  rootPath: string,
  query: string,
  options: CodeSearchOptions = {}
): CodeSearchResult[] {
  const terms = [...new Set(tokenizeCode(query))];
  if (terms.length === 0) return [];

  const maxFileBytes = options.maxFileBytes ?? 512 * 1024;
  const maxResults = options.maxResults ?? 20;
  if (!Number.isInteger(maxFileBytes) || maxFileBytes < 1) {
    throw new Error("maxFileBytes must be a positive integer");
  }
  if (!Number.isInteger(maxResults) || maxResults < 1) {
    throw new Error("maxResults must be a positive integer");
  }

  const results: CodeSearchResult[] = [];
  for (const file of discoverFiles(rootPath)) {
    const absolutePath = join(rootPath, file.path);
    let source: string;
    try {
      if (statSync(absolutePath).size > maxFileBytes) continue;
      const buffer = readFileSync(absolutePath);
      if (buffer.includes(0)) continue;
      source = buffer.toString("utf8");
    } catch {
      continue;
    }

    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const normalizedLine = tokenizeCode(line);
      if (normalizedLine.length === 0) continue;

      let score = 0;
      for (const term of terms) {
        const exactTokenMatches = normalizedLine.filter((token) => token === term).length;
        if (exactTokenMatches > 0) score += 3 + Math.min(exactTokenMatches - 1, 2);
        else if (normalizedLine.some((token) => token.includes(term))) score += 1;
      }
      if (score > 0) {
        results.push({
          path: file.path,
          line: index + 1,
          snippet: line.trim().slice(0, 240),
          score
        });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || a.line - b.line)
    .slice(0, maxResults);
}


export type CodeSymbolKind = "function" | "class" | "interface" | "type" | "enum" | "variable";

export interface CodeSymbol {
  name: string;
  kind: CodeSymbolKind;
  path: string;
  line: number;
  exported: boolean;
}

/**
 * Extract top-level TypeScript/JavaScript declarations using a lightweight
 * line-oriented parser. This is intentionally heuristic: it does not claim
 * to replace a language parser or resolve symbols across files.
 */
export function extractCodeSymbols(source: string, path: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const seen = new Set<string>();
  const lines = source.split(/\r?\n/);
  const declaration = /^\s*(export\s+(?:default\s+|declare\s+|abstract\s+|async\s+)*)?(?:declare\s+)?(function\*?|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)\b/;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(declaration);
    if (!match) continue;

    const prefix = match[1] ?? "";
    const keyword = match[2];
    const name = match[3];
    const kind: CodeSymbolKind = keyword.startsWith("function")
      ? "function"
      : keyword === "class"
        ? "class"
        : keyword === "interface"
          ? "interface"
          : keyword === "type"
            ? "type"
            : keyword === "enum"
              ? "enum"
              : "variable";
    const identity = kind + ":" + name;
    if (seen.has(identity)) continue;
    seen.add(identity);
    symbols.push({
      name,
      kind,
      path,
      line: index + 1,
      exported: /\bexport\b/.test(prefix)
    });
  }

  return symbols;
}


export type ProjectGraphNodeType = "project" | "file" | "language" | "framework" | "package" | "commit" | "branch";
export type ProjectGraphEdgeType = "contains" | "uses-language" | "uses-framework" | "depends-on" | "has-commit" | "points-to" | "imports";

export interface ProjectGraphNode {
  id: string;
  type: ProjectGraphNodeType;
  label: string;
  path?: string;
}

export interface ProjectGraphEdge {
  source: string;
  target: string;
  type: ProjectGraphEdgeType;
}

export interface ProjectGraph {
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
}

/** Build a deterministic, in-memory relationship graph from an ingested snapshot. */
export function buildProjectGraph(snapshot: RepositorySnapshot): ProjectGraph {
  const nodes: ProjectGraphNode[] = [{
    id: "project:root",
    type: "project",
    label: basename(snapshot.rootPath) || "project"
  }];
  const edges: ProjectGraphEdge[] = [];
  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const knownEdgeIds = new Set<string>();

  const addNode = (node: ProjectGraphNode): void => {
    if (knownNodeIds.has(node.id)) return;
    knownNodeIds.add(node.id);
    nodes.push(node);
  };
  const addEdge = (source: string, target: string, type: ProjectGraphEdgeType): void => {
    const key = JSON.stringify([source, target, type]);
    if (knownEdgeIds.has(key)) return;
    knownEdgeIds.add(key);
    edges.push({ source, target, type });
  };

  for (const file of snapshot.files) {
    const id = "file:" + file.path;
    addNode({ id, type: "file", label: basename(file.path), path: file.path });
    addEdge("project:root", id, "contains");

    const language = LANGUAGE_BY_EXTENSION[file.extension ? "." + file.extension : ""];
    if (language) {
      const languageId = "language:" + language;
      addNode({ id: languageId, type: "language", label: language });
      addEdge(id, languageId, "uses-language");
    }
  }

  for (const framework of snapshot.frameworks) {
    const id = "framework:" + framework;
    addNode({ id, type: "framework", label: framework });
    addEdge("project:root", id, "uses-framework");
  }

  // Capture direct package dependencies from the root Node.js manifest.
  try {
    const manifest = JSON.parse(readFileSync(join(snapshot.rootPath, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const dependencyNames = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {})
    ]);

    for (const name of [...dependencyNames].sort()) {
      const id = "package:" + name;
      addNode({ id, type: "package", label: name });
      addEdge("project:root", id, "depends-on");
    }
  } catch {
    // A package.json is optional; repositories without one still produce a graph.
  }

  // Resolve relative source imports against files already discovered by the scanner.
  // This intentionally avoids guessing at package imports or requiring language-specific parsers.
  const filePaths = new Set(snapshot.files.map((file) => file.path.replaceAll("\\", "/")));
  const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];

  const resolveImport = (fromPath: string, specifier: string): string | null => {
    const basePath = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
    const candidates = [basePath];

    if (!posix.extname(basePath)) {
      candidates.push(...sourceExtensions.map((extension) => basePath + extension));
      candidates.push(...sourceExtensions.map((extension) => posix.join(basePath, "index" + extension)));
    }

    return candidates.find((candidate) => filePaths.has(candidate)) ?? null;
  };

  for (const file of snapshot.files) {
    if (!["ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts"].includes(file.extension)) continue;

    let source: string;
    try {
      source = readFileSync(join(snapshot.rootPath, file.path), "utf8");
    } catch {
      continue;
    }

    const importPattern = /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\()\s*["'](\.{1,2}\/[^"']+)["']/g;
    for (const match of source.matchAll(importPattern)) {
      const targetPath = resolveImport(file.path.replaceAll("\\", "/"), match[1]);
      if (targetPath) addEdge("file:" + file.path, "file:" + targetPath, "imports");
    }
  }

  if (snapshot.git) {
    const commitIds = new Set<string>();
    for (const commit of snapshot.git.commits) {
      const id = "commit:" + commit.hash;
      commitIds.add(commit.hash);
      addNode({ id, type: "commit", label: commit.subject || commit.hash.slice(0, 7) });
      addEdge("project:root", id, "has-commit");
    }

    for (const branch of snapshot.git.branches) {
      const branchId = "branch:" + branch.name;
      addNode({
        id: branchId,
        type: "branch",
        label: branch.current ? branch.name + " (current)" : branch.name
      });
      addEdge("project:root", branchId, "contains");

      const commitId = "commit:" + branch.commit;
      if (!commitIds.has(branch.commit)) {
        addNode({ id: commitId, type: "commit", label: branch.commit.slice(0, 7) });
        commitIds.add(branch.commit);
        addEdge("project:root", commitId, "has-commit");
      }
      addEdge(branchId, commitId, "points-to");
    }
  }

  nodes.sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
  edges.sort((a, b) =>
    a.source.localeCompare(b.source) ||
    a.type.localeCompare(b.type) ||
    a.target.localeCompare(b.target)
  );
  return { nodes, edges };
}

/** Validate graph identity and relationship integrity without mutating the graph. */
export function validateProjectGraph(graph: ProjectGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push("Duplicate node id: " + node.id);
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) errors.push("Missing edge source: " + edge.source);
    if (!nodeIds.has(edge.target)) errors.push("Missing edge target: " + edge.target);
    const key = JSON.stringify([edge.source, edge.target, edge.type]);
    if (edgeIds.has(key)) errors.push("Duplicate edge: " + key);
    edgeIds.add(key);
  }

  return { valid: errors.length === 0, errors };
}
