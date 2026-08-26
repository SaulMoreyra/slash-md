import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, waitFor, userEvent } from "../../../../../test/render";
import { CreatePageForm } from "../CreatePageForm";
import { CreateIntent } from "../../../enums";

describe("CreatePageForm", () => {
  const onCreate = vi.fn();
  const listTemplates = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    listTemplates.mockResolvedValue([
      { id: "blank", label: "Blank", description: "", source: "builtin" },
      { id: "doc", label: "Doc", description: "A doc", source: "builtin" },
    ]);
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { listTemplates },
    });
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof CreatePageForm>> = {}) =>
    renderWithProviders(<CreatePageForm onCreate={onCreate} {...props} />);

  it("creates with title and default template", async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: t("home.modals.templates.blank.label") }),
      ).toBeInTheDocument(),
    );
    await user.type(screen.getByLabelText(t("home.modals.page.titleLabel")), "Hello");
    await user.click(screen.getByRole("button", { name: t("common.create") }));
    expect(onCreate).toHaveBeenCalledWith({
      title: "Hello",
      templateId: "blank",
      section: undefined,
    });
  });

  it("shows creating state while busy", async () => {
    renderComponent({ busy: true });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: t("home.modals.templates.blank.label") }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: t("common.creating") })).toBeDisabled();
  });

  it("groups workspace templates above builtins", async () => {
    listTemplates.mockResolvedValue([
      { id: "prd", label: "PRD", description: "Problem, user, and success criteria", source: "workspace" },
      { id: "blank", label: "Blank", description: "", source: "builtin" },
    ]);
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText(t("home.modals.templates.workspace"))).toBeInTheDocument(),
    );
    expect(screen.getByText(t("home.modals.templates.builtin"))).toBeInTheDocument();
    expect(screen.getByText(t("home.modals.templates.workspaceBadge"))).toBeInTheDocument();
    expect(screen.getByText("PRD")).toBeInTheDocument();
    expect(screen.getByText("Problem, user, and success criteria")).toBeInTheDocument();
  });

  it("uses template copy when creating inside templates/", async () => {
    renderComponent({ createIntent: CreateIntent.Template, section: "templates" });
    expect(screen.getByLabelText(t("home.modals.template.titleLabel"))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(t("home.modals.template.titlePlaceholder"))).toBeInTheDocument();
    expect(screen.getByText(t("home.modals.template.startFrom"))).toBeInTheDocument();
  });
});
