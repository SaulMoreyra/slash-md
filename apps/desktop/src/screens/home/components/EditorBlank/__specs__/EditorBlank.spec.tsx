import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { EditorBlank } from "../EditorBlank";

describe("EditorBlank", () => {
  const onCreate = vi.fn();
  const onNewPublication = vi.fn();
  const listTemplates = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    listTemplates.mockResolvedValue([
      { id: "blank", label: "Blank", description: "", source: "builtin" },
    ]);
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { listTemplates },
    });
  });

  it("shows the process guide instead of the create form when read-only", () => {
    renderWithProviders(
      <EditorBlank showProcessGuide onCreate={onCreate} onNewPublication={onNewPublication} />,
    );
    expect(screen.getByText(t("home.process.title"))).toBeInTheDocument();
    expect(screen.queryByLabelText(t("home.modals.page.titleLabel"))).not.toBeInTheDocument();
  });

  it("calls onNewPublication from the guide CTA", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditorBlank showProcessGuide onCreate={onCreate} onNewPublication={onNewPublication} />,
    );
    await user.click(screen.getByRole("button", { name: t("home.publication.new") }));
    expect(onNewPublication).toHaveBeenCalled();
  });
});
