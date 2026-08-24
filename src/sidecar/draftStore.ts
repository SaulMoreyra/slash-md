import * as vscode from "vscode";
import { getDraftMeta } from "./draftMeta";
import { labeledTitle } from "../domain/messaging";

const DRAFTS_DIR = "drafts";
const EXT = ".slash.md";

export class DraftStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private draftsDir(): vscode.Uri {
    return vscode.Uri.joinPath(this.context.globalStorageUri, DRAFTS_DIR);
  }

  async createDraft(markdown = "# Untitled\n"): Promise<vscode.Uri> {
    await vscode.workspace.fs.createDirectory(this.draftsDir());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uri = vscode.Uri.joinPath(this.draftsDir(), `draft-${stamp}${EXT}`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, "utf8"));
    return uri;
  }

  async listDrafts(): Promise<vscode.Uri[]> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(this.draftsDir());
      return entries
        .filter(([name, type]) => type === vscode.FileType.File && name.endsWith(EXT))
        .map(([name]) => vscode.Uri.joinPath(this.draftsDir(), name))
        .sort((a, b) => b.path.localeCompare(a.path));
    } catch (err) {
      if (err instanceof vscode.FileSystemError && err.code === "FileNotFound") {
        return [];
      }
      throw err;
    }
  }

  async deleteDraft(uri: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.delete(uri, { useTrash: false });
    } catch (err) {
      if (!(err instanceof vscode.FileSystemError && err.code === "FileNotFound")) {
        throw err;
      }
    }
  }

  async pickDraft(): Promise<vscode.Uri | undefined> {
    const drafts = await this.listDrafts();
    if (drafts.length === 0) {
      await vscode.window.showInformationMessage("No drafts yet. Use Slash MD: New.");
      return undefined;
    }

    const items = await Promise.all(
      drafts.map(async (uri) => {
        const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
        const meta = getDraftMeta(this.context, uri);
        const filename = uri.path.split("/").pop() ?? uri.path;
        return {
          label: meta.pendingDelete ? `Delete: ${labeledTitle(text, filename)}` : labeledTitle(text, filename),
          description: meta.remotePath || filename,
          uri,
        };
      }),
    );

    const picked = await vscode.window.showQuickPick(items, { placeHolder: "Open draft" });
    return picked?.uri;
  }
}
