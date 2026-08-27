import { resolveCreateTarget } from "@slash-md/core/createPath";

export function formatFolderPath(section?: string): string {
  if (!section) {
    return "/";
  }
  return `/${section}`;
}

export function formatCreatePaths(
  section: string | undefined,
  title: string,
  untitled: string,
): { folderPath: string; filePath: string } {
  const target = resolveCreateTarget(section, title, untitled);
  const folderPath = formatFolderPath(target.section);
  const fileName = `${target.slug}.md`;
  const filePath = folderPath === "/" ? `/${fileName}` : `${folderPath}/${fileName}`;
  return { folderPath, filePath };
}

export function formatCreateFilePath(
  section: string | undefined,
  title: string,
  untitled: string,
): string {
  return formatCreatePaths(section, title, untitled).filePath;
}

