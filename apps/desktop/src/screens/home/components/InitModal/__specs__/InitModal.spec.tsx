import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { WorkspaceInfo } from "../../../../../../shared/api";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { InitModal } from "../InitModal";

function workspace(slashmd: WorkspaceInfo["slashmd"]): WorkspaceInfo {
  return {
    root: "/tmp/wiki",
    config: null,
    slashmd,
    needsInit: true,
    auth: null,
    theme: "dark",
  };
}

describe("InitModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const detectGit = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    detectGit.mockResolvedValue({ repo: "acme/Help", branch: "main", hasDocsDir: false });
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { detectGit },
    });
  });

  it("hides the Pages toggle in local mode", () => {
    renderWithProviders(
      <InitModal workspace={workspace({ mode: "local" })} onClose={onClose} onSave={onSave} />,
    );
    expect(screen.queryByLabelText(t("home.modals.init.siteTitle"))).not.toBeInTheDocument();
  });

  it("writes site.enabled when the Pages toggle is on", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <InitModal
        workspace={workspace({ repo: "acme/Help", mode: "workspace" })}
        onClose={onClose}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByLabelText(t("home.modals.init.siteTitle")));
    await user.click(screen.getByRole("button", { name: t("home.modals.init.save") }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: "acme/Help",
        mode: "workspace",
        site: expect.objectContaining({ enabled: true, name: "Help" }),
      }),
    );
  });
});
