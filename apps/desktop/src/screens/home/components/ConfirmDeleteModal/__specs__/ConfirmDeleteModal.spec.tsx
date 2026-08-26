import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { TreeEntryKind } from "../../../enums";
import { renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";

describe("ConfirmDeleteModal", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    renderWithProviders(
      <ConfirmDeleteModal
        target={{ kind: TreeEntryKind.File, path: "docs/a.md", title: "Alpha" }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

  it("confirms deletion", async () => {
    const user = userEvent.setup();
    renderComponent();
    expect(screen.getByText(t("home.modals.delete.bodyFile", { title: "Alpha" }))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("common.delete") }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows deleting state while busy", () => {
    renderWithProviders(
      <ConfirmDeleteModal
        target={{ kind: TreeEntryKind.File, path: "docs/a.md", title: "Alpha" }}
        busy
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("button", { name: t("common.deleting") })).toBeDisabled();
    expect(screen.getByRole("button", { name: t("common.cancel") })).toBeDisabled();
  });
});
