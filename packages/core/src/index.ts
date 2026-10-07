export interface Project {
  rootPath: string;
  name: string;
}

export function createProject(rootPath: string, name: string): Project {
  return { rootPath, name };
}
