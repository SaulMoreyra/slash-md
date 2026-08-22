import * as vscode from "vscode";
import { patchDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";
import { getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { posixJoin } from "./paths";
import { resolveContentConfig } from "./openFromGithub";
import { pickSection } from "./sections";
import { slugify } from "./slug";
import { TEMPLATE_PICKS, TemplateId, fillTemplate, loadTemplate, todayDate } from "./templates";
import { assertSafeRepoPath } from "./github/review";

export async function createNewDraft(opts: {
  context: vscode.ExtensionContext;
  store: DraftStore;
  repos: ContentRepo;
  draftsTree: { refresh(): void };
  docsTree?: { refresh(): void };
  section?: string;
}): Promise<void> {
  const template = await pickTemplate();
  if (!template) {
    return;
  }
  const title = await vscode.window.showInputBox({
    title: "Slash MD: New",
    prompt: "Document title",
    value: "Untitled",
    ignoreFocusOut: true,
  });
  if (!title?.trim()) {
    return;
  }

  const config = getContentConfig() ?? (await resolveContentConfig(opts.context));
  const contentPath = config?.contentPath ?? "docs";
  const section = opts.section ?? (await pickSection(opts.repos, contentPath));
  if (section === undefined) {
    return;
  }

  const remotePath = assertSafeRepoPath(
    config ?? { repo: "", owner: "", name: "", contentPath, defaultBranch: "main", mode: "workspace" },
    posixJoin(section || contentPath, `${slugify(title)}.md`),
  );

  const source = await loadTemplate(opts.context.extensionUri, template);
  let owner = "";
  try {
    const session = await vscode.authentication.getSession("github", ["repo"], { silent: true });
    owner = session?.account.label ?? "";
  } catch {
    owner = "";
  }
  const markdown = fillTemplate(source, {
    title: title.trim(),
    date: todayDate(),
    owner,
  });
  const uri = await opts.store.createDraft(markdown);
  await patchDraftMeta(opts.context, uri, {
    remotePath,
    kind: "draft",
    label: "",
  });
  opts.draftsTree.refresh();
  opts.docsTree?.refresh();
  await vscode.commands.executeCommand("vscode.openWith", uri, "slash-md.editor");
}

async function pickTemplate(): Promise<TemplateId | undefined> {
  const picked = await vscode.window.showQuickPick(TEMPLATE_PICKS, {
    title: "Slash MD: New",
    placeHolder: "Template",
    ignoreFocusOut: true,
  });
  return picked?.id;
}
