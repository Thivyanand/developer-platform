export interface PlatformConfig {
  projectRoot: string;
  dataDirectory: string;
}

export function defaultConfig(projectRoot: string): PlatformConfig {
  return {
    projectRoot,
    dataDirectory: ".developer-platform"
  };
}
