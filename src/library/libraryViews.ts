import { DocsTreeProvider } from "./docsTree";
import { DraftsTreeProvider } from "./draftsTree";

/** Shared handle so the editor can refresh the Activity Bar trees after save/review. */
export class LibraryViews {
  constructor(
    readonly drafts: DraftsTreeProvider,
    readonly docs: DocsTreeProvider,
    private readonly home?: { refresh(): void | Promise<void> },
    private readonly inbox?: { refreshBadge(): void | Promise<unknown> },
  ) {}

  refresh(): void {
    this.drafts.refresh();
    this.docs.refresh();
    void this.home?.refresh();
    void this.inbox?.refreshBadge();
  }

  /** Labels/status only — keep the remote file list cache. */
  refreshLabels(): void {
    this.drafts.refresh();
    this.docs.refreshLabels();
    void this.home?.refresh();
    void this.inbox?.refreshBadge();
  }
}
