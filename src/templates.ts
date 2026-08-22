import * as vscode from "vscode";
import { setFrontmatterField, splitFrontmatter } from "./frontmatter";

export type TemplateId = "blank" | "prd" | "spec" | "decision";

export const TEMPLATE_PICKS: { id: TemplateId; label: string; description: string }[] = [
  { id: "blank", label: "Blank", description: "Frontmatter + title" },
  { id: "prd", label: "PRD", description: "Problem, proposal, scope" },
  { id: "spec", label: "Spec", description: "Behavior and non-goals" },
  { id: "decision", label: "Decision", description: "Context, decision, consequences" },
];

export async function loadTemplate(extensionUri: vscode.Uri, id: TemplateId): Promise<string> {
  const uri = vscode.Uri.joinPath(extensionUri, "templates", `${id}.md`);
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString("utf8");
}

export function fillTemplate(
  source: string,
  opts: { title: string; owner?: string; date: string },
): string {
  const replaced = source
    .replaceAll("{{title}}", opts.title)
    .replaceAll("{{owner}}", opts.owner ?? "")
    .replaceAll("{{date}}", opts.date);
  let next = replaced;
  next = setFrontmatterField(next, "title", opts.title);
  next = setFrontmatterField(next, "status", "draft");
  next = setFrontmatterField(next, "updated", opts.date);
  if (opts.owner) {
    next = setFrontmatterField(next, "owner", opts.owner);
  }
  const { raw, body } = splitFrontmatter(next);
  if (!/^#\s+/m.test(body)) {
    return `${raw}# ${opts.title}\n\n${body.replace(/^\n+/, "")}`;
  }
  return next;
}

export function todayDate(at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}
