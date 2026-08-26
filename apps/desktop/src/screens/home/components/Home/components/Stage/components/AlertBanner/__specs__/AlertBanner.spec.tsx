import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { WikiSyncStatus } from "@slash-md/core/homeTypes";
import { cleanup, renderWithProviders, screen } from "../../../../../../../../../test/render";
import { AlertBanner } from "../AlertBanner";

describe("AlertBanner", () => {
  const onSync = vi.fn();
  const onOpenConflicts = vi.fn();

  const defaultProps = {
    error: "needs approval" as string | null,
    merging: false,
    wikiSyncStatus: "idle" as WikiSyncStatus,
    busy: false,
    onSync,
    onOpenConflicts,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<AlertBanner {...defaultProps} {...props} />);

  it("translates the needs-approval publish blocker", () => {
    renderComponent({ error: "Error invoking remote method 'publishBatch': Error: needs approval" });
    expect(screen.getByText(t("home.pr.publishNeedsApproval"))).toBeInTheDocument();
    expect(screen.queryByText(/Error invoking remote method/)).not.toBeInTheDocument();
  });

  it("keeps the wiki clash flow for conflict errors", () => {
    renderComponent({ error: "needs approval · conflict" });
    expect(screen.getByText(t("home.conflicts.publishBlocked"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.conflicts.sync") })).toBeInTheDocument();
  });

  it("prompts to bring wiki changes when behind", () => {
    renderComponent({ error: null, wikiSyncStatus: "behind" });
    expect(screen.getByText(t("home.conflicts.bannerBehindTitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.conflicts.sync") })).toBeInTheDocument();
  });
});
