import * as vscode from "vscode";
import { getContentConfig } from "../github/config";
import { invalidateInboxCache, loadInboxSilent, type InboxResult } from "../github/inbox";
import { docsWorkspaceRoot } from "../home/homeTree";

const POLL_MS = 60_000;

/**
 * Activity Bar badge for unresolved review threads.
 * Independent of an open editor; uses TreeView.badge.
 */
export class InboxHost implements vscode.Disposable {
  private poll: ReturnType<typeof setInterval> | undefined;
  private homeVisible = false;
  private treeVisible = false;
  private draftsView: { badge?: vscode.ViewBadge } | undefined;
  onHomeTick?: () => void | Promise<void>;

  attachTreeView(view: { badge?: vscode.ViewBadge }): void {
    this.draftsView = view;
  }

  applyCount(count: number): void {
    if (!this.draftsView) {
      return;
    }
    this.draftsView.badge =
      count > 0
        ? {
            value: count,
            tooltip:
              count === 1 ? "1 unresolved review comment" : `${count} unresolved review comments`,
          }
        : undefined;
  }

  async refreshBadge(): Promise<InboxResult> {
    const config = getContentConfig();
    const workspaceRoot = config ? await docsWorkspaceRoot(config) : undefined;
    const result = await loadInboxSilent(workspaceRoot);
    this.applyCount(result.items.length);
    return result;
  }

  setHomeVisible(visible: boolean, opts?: { refresh?: boolean }): void {
    const gained = visible && !this.homeVisible;
    this.homeVisible = visible;
    this.syncPoll();
    if (gained && opts?.refresh !== false) {
      void this.tick();
    }
  }

  setTreeVisible(visible: boolean): void {
    const gained = visible && !this.treeVisible;
    this.treeVisible = visible;
    this.syncPoll();
    if (gained && !this.homeVisible) {
      void this.refreshBadge();
    }
  }

  dispose(): void {
    this.stopPoll();
  }

  private syncPoll(): void {
    if (this.homeVisible || this.treeVisible) {
      this.startPoll();
    } else {
      this.stopPoll();
    }
  }

  private startPoll(): void {
    if (this.poll) {
      return;
    }
    this.poll = setInterval(() => {
      void this.tick();
    }, POLL_MS);
  }

  private stopPoll(): void {
    if (!this.poll) {
      return;
    }
    clearInterval(this.poll);
    this.poll = undefined;
  }

  private async tick(): Promise<void> {
    if (this.homeVisible && this.onHomeTick) {
      invalidateInboxCache();
      await this.onHomeTick();
      return;
    }
    invalidateInboxCache();
    await this.refreshBadge();
  }
}
