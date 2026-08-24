import * as vscode from "vscode";
import { ContentConfig } from "../github/config";
import { docsContentRemotePath } from "../workspace/docsWorkspace";
import { readStagingSelection, writeStagingSelection } from "../workspace/localDrafts";
import { posixNormalize } from "../domain/paths";

/** Stage this wiki page and open Home for batch review (local-first path). */
export async function openHomeForWikiReview(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  config: ContentConfig,
): Promise<void> {
  const path = await docsContentRemotePath(document.uri, config);
  if (!path) {
    await vscode.window.showWarningMessage("Could not resolve this page in the docs workspace.");
    return;
  }
  const normalized = posixNormalize(path);
  const selected = readStagingSelection(context);
  if (!selected.includes(normalized)) {
    await writeStagingSelection(context, [...selected, normalized]);
  }
  await vscode.commands.executeCommand("slash-md.home");
  await vscode.window.showInformationMessage(
    "Página seleccionada en Borradores locales. Usa Mandar a Revisión en Home.",
  );
}

/** Open Home for lote publish — wiki pages merge via Home, not the editor bar. */
export async function openHomeForWikiPublish(context: vscode.ExtensionContext): Promise<void> {
  await vscode.commands.executeCommand("slash-md.home");
  await vscode.window.showInformationMessage(
    "Usa Aprobar y Publicar en Home cuando el PR esté aprobado en GitHub.",
  );
}
