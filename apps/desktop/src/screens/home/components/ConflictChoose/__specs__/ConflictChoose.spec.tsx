import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { mockConflictFile } from "../../../__fixtures__/home";
import { ConflictChoose } from "../ConflictChoose";

describe("ConflictChoose", () => {
  const onReview = vi.fn();
  const onKeepMine = vi.fn();
  const onRequestUseWiki = vi.fn();
  const onMarkResolved = vi.fn();

  const defaultProps = {
    file: mockConflictFile({
      oursMarkdown: "# Title\n\nMine paragraph.\n\nShared.",
      theirsMarkdown: "# Title\n\nWiki paragraph.\n\nShared.",
    }),
    busy: false,
    decided: false,
    resolvedMarkdown: undefined as string | undefined,
    onReview,
    onKeepMine,
    onRequestUseWiki,
    onMarkResolved,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<ConflictChoose {...defaultProps} {...props} />);

  it("shows split headers and article labels", () => {
    renderComponent();
    expect(screen.getByText(t("home.conflicts.yoursCard"))).toBeInTheDocument();
    expect(screen.getByText(t("home.conflicts.wikiCard"))).toBeInTheDocument();
    expect(screen.getByText(t("home.conflicts.bothChanged"))).toBeInTheDocument();
    expect(screen.getAllByText(t("home.conflicts.yours")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t("home.conflicts.wiki")).length).toBeGreaterThan(0);
  });

  it("keeps the publication version from the column action", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getAllByRole("button", { name: t("home.conflicts.keepMine") })[0]!);
    expect(onKeepMine).toHaveBeenCalled();
  });

  it("shows binary pick-one actions", () => {
    renderComponent({
      file: mockConflictFile({ kind: "binary", oursMarkdown: null, theirsMarkdown: null }),
    });
    expect(screen.getByText(t("home.conflicts.binaryHint"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.conflicts.keepMine") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.conflicts.useWiki") })).toBeInTheDocument();
  });

  it("shows final version when decided", () => {
    renderComponent({
      decided: true,
      resolvedMarkdown: "# Final\n",
    });
    expect(screen.getByText(t("home.conflicts.readyBanner"))).toBeInTheDocument();
    expect(screen.getByText(t("home.conflicts.finalVersion"))).toBeInTheDocument();
    expect(screen.getByText("# Final")).toBeInTheDocument();
  });
});
