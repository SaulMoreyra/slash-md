import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { FolderModal } from "../FolderModal";

describe("FolderModal", () => {
  const onClose = vi.fn();
  const onCreate = vi.fn();

  const defaultProps = { onClose, onCreate };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> & { parent?: string } = {}) =>
    renderWithProviders(<FolderModal {...defaultProps} {...props} />);

  it("shows the explicit parent path", () => {
    renderComponent({ parent: "docs/guides" });
    expect(screen.getByText("docs/guides")).toBeInTheDocument();
    expect(screen.getByText(t("home.modals.folder.destination"))).toBeInTheDocument();
  });

  it("creates with the typed name", async () => {
    const user = userEvent.setup();
    renderComponent({ parent: "docs/guides" });
    await user.type(screen.getByLabelText(t("home.modals.folder.name")), "experiments");
    await user.click(screen.getByRole("button", { name: t("common.create") }));
    expect(onCreate).toHaveBeenCalledWith("experiments");
  });
});
