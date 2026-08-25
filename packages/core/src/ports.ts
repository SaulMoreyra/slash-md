/** Host-agnostic ports. Apps (VS Code / Electron) supply implementations. */

export type AuthSession = {
  accessToken: string;
  account?: { label?: string; id?: string };
};

export type Auth = {
  getSession(opts?: { createIfNone?: boolean; silent?: boolean }): Promise<AuthSession | undefined>;
};

export type GitRunner = {
  run(args: string[], opts?: { cwd?: string; token?: string }): Promise<string>;
  runBuffer?(args: string[], opts?: { cwd?: string; token?: string }): Promise<Uint8Array>;
};

export type FsStat = {
  isFile: boolean;
  isDirectory: boolean;
};

export type FsPort = {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  readDirectory(path: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>>;
  createDirectory(path: string): Promise<void>;
  delete(path: string, opts?: { recursive?: boolean }): Promise<void>;
  exists(path: string): Promise<boolean>;
  join(...parts: string[]): string;
};

export type HostUi = {
  showInformation(message: string): Promise<void> | void;
  showWarning(message: string): Promise<void> | void;
  showError(message: string): Promise<void> | void;
  withProgress?<T>(title: string, task: () => Promise<T>): Promise<T>;
  openExternal?(url: string): Promise<void> | void;
};
