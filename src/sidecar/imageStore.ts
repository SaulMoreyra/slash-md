import * as vscode from "vscode";
import { posixNormalize } from "../domain/paths";

export class ImageStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  root(): vscode.Uri {
    return vscode.Uri.joinPath(this.context.globalStorageUri, "images");
  }

  file(repoPath: string): vscode.Uri {
    return vscode.Uri.joinPath(this.root(), ...posixNormalize(repoPath).split("/").filter(Boolean));
  }

  async save(repoPath: string, bytes: Uint8Array): Promise<vscode.Uri> {
    const uri = this.file(repoPath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri, ".."));
    await vscode.workspace.fs.writeFile(uri, bytes);
    return uri;
  }

  async read(repoPath: string): Promise<Uint8Array | undefined> {
    try {
      return await vscode.workspace.fs.readFile(this.file(repoPath));
    } catch {
      return undefined;
    }
  }
}
