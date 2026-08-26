import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { mockConflictFile } from "../../../__fixtures__/home";
import { ConflictPane } from "../ConflictPane";

describe("ConflictPane", () => {
  const onSelect = vi.fn();
  const onRequestAbort = vi.fn();
  const onFinish = vi.fn();

  const defaultProps: ComponentProps<typeof ConflictPane> = {
    files: [mockConflictFile()],
    decided: [],
    selectedPath: "docs/a.md",
    canFinish: false,
    remainingCount: 1,
    totalCount: 1,
    busy: false,
    onSelect,
    onRequestAbort,
    onFinish,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<ConflictPane {...defaultProps} {...props} />);

  it("lists clash pages with human status", () => {
    renderComponent();
    expect(screen.getByText(t("home.conflicts.title"))).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText(t("home.conflicts.statusNeedsChoice"))).toBeInTheDocument();
    expect(
      screen.getByText(
        t("home.conflicts.progressChoice", { count: 1, remaining: 1, total: 1 }),
      ),
    ).toBeInTheDocument();
  });

  it("disables update until all pages are decided", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: t("home.conflicts.finish") })).toBeDisabled();
    expect(
      screen.getByText(
        t("home.conflicts.progressChoice", { count: 1, remaining: 1, total: 1 }),
      ),
    ).toBeInTheDocument();
  });

  it("enables finish when the queue is empty", async () => {
    const user = userEvent.setup();
    renderComponent({
      files: [],
      decided: [{ ...mockConflictFile(), resolvedMarkdown: "# Ours\n" }],
      selectedPath: "docs/a.md",
      canFinish: true,
      remainingCount: 0,
      totalCount: 1,
    });
    expect(screen.getByText(t("home.conflicts.statusDecided"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.conflicts.finish") }));
    expect(onFinish).toHaveBeenCalled();
  });

  it("requests abort from the footer", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.conflicts.cancel") }));
    expect(onRequestAbort).toHaveBeenCalled();
  });
});
