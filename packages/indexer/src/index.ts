export interface RepositoryFile {
  path: string;
  extension: string;
}

export function describeFile(path: string): RepositoryFile {
  const dot = path.lastIndexOf(".");
  return {
    path,
    extension: dot >= 0 ? path.slice(dot + 1) : ""
  };
}
