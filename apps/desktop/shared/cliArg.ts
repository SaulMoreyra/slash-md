/** Args after `--` are the folder to open (`slash .` → `electron . -- /abs/path`). */
export function parseFolderArg(argv: string[]): string | undefined {
  const sep = argv.indexOf("--");
  if (sep < 0) {
    return undefined;
  }
  return argv.slice(sep + 1).find((arg) => arg.length > 0 && !arg.startsWith("-"));
}
