import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

export interface RepositoryFile {
  path: string;
  extension: string;
}

export interface RepositorySnapshot {
  rootPath: string;
  files: RepositoryFile[];
  languages: string[];
  frameworks: string[];
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

function discoverFiles(rootPath: string, currentPath = rootPath): RepositoryFile[] {
  const entries = readdirSync(currentPath, { withFileTypes: true });
  const files: RepositoryFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolutePath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...discoverFiles(rootPath, absolutePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relativePath = relative(rootPath, absolutePath);
    files.push({
      path: relativePath,
      extension: extname(entry.name).slice(1).toLowerCase()
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function detectLanguages(files: RepositoryFile[]): string[] {
  return [...new Set(
    files
      .map((file) => LANGUAGE_BY_EXTENSION[extname(`.${file.extension}`).toLowerCase()])
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
    throw new Error(`Repository root is not a directory: ${rootPath}`);
  }

  const files = discoverFiles(rootPath);

  return {
    rootPath,
    files,
    languages: detectLanguages(files),
    frameworks: detectFrameworks(rootPath, files)
  };
}
