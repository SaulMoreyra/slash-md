import fs from "node:fs";
import path from "node:path";

export function resolveExistingFolder(raw: string, cwd = process.cwd()): string {
  const abs = path.resolve(cwd, raw);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    throw new Error(`That path does not exist: ${abs}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`That path is not a folder: ${abs}`);
  }
  return abs;
}
