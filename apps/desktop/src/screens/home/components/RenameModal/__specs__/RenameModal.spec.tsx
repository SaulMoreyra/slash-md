import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { TreeEntryKind } from "../../../enums";
import { renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { RenameModal } from "../RenameModal";

describe("RenameModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (kind: TreeEntryKind = TreeEntryKind.File) =>
    renderWithProviders(
      <RenameModal
        target={{ kind, path: kind === TreeEntryKind.Folder ? "docs/guides" : "docs/a.md", title: "Alpha" }}
        onClose={onClose}
        onSave={onSave}
      />,
    );

  it("saves the trimmed name for a file", async () => {
    const user = userEvent.setup();
    renderComponent();
    const input = screen.getByLabelText(t("home.modals.rename.name"));
    await user.clear(input);
    await user.type(input, "Renamed");
    await user.click(screen.getByRole("button", { name: t("common.save") }));
    expect(onSave).toHaveBeenCalledWith("Renamed");
  });

  it("shows folder copy for a folder target", () => {
    renderComponent(TreeEntryKind.Folder);
    expect(screen.getByText(t("home.modals.rename.hintFolder"))).toBeInTheDocument();
  });
});
