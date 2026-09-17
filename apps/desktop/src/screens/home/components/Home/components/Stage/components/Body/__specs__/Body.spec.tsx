import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { cleanup, renderWithProviders, screen, waitFor } from "../../../../../../../../../test/render";
import { CreateIntent } from "../../../../../../../enums";
import type { HomeControllerApi } from "../../../../../../../hooks/useHomeController";
import { HomeContext } from "../../../../../context";
import { Body } from "../Body";

describe("Body", () => {
  const onInit = vi.fn();
  const onCreatePage = vi.fn();
  const listTemplates = vi.fn();

  const defaultProps = {
    needsInit: false,
    loading: false,
    hasPage: false,
    section: "docs/prds" as string | undefined,
    createIntent: CreateIntent.Page,
    busy: false,
    showProcessGuide: false,
    onInit,
    onCreatePage,
    onRequestPublication: vi.fn(),
    children: <div>editor</div>,
  };

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

  const renderComponent = (
    props: Partial<typeof defaultProps> = {},
    home: Partial<HomeControllerApi> = {},
  ) =>
    renderWithProviders(
      <HomeContext.Provider
        value={
          {
            conflicts: { merging: false },
            tabs: {
              items: [],
              activeKey: null,
              onActivateTab: vi.fn(),
              onCloseTab: vi.fn(),
            },
            ...home,
          } as unknown as HomeControllerApi
        }
      >
        <Body {...defaultProps} {...props} />
      </HomeContext.Provider>,
    );

  it("shows the template picker when a folder is selected without a page", async () => {
    renderComponent();
    expect(screen.queryByText(t("home.selectPageOrCreate"))).not.toBeInTheDocument();
    expect(screen.getByLabelText(t("home.create.targetAria", { path: "/docs/prds" }))).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: t("home.modals.templates.blank.label") }),
      ).toBeInTheDocument(),
    );
  });

  it("uses template copy when the folder is under templates/", () => {
    renderComponent({ createIntent: CreateIntent.Template, section: "templates/foo" });
    expect(screen.queryByText(t("home.selectTemplateOrCreate"))).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(t("home.create.targetAria", { path: "/templates/foo" })),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(t("home.modals.template.titleLabel"))).toBeInTheDocument();
  });

  it("renders the open page instead of the blank picker", () => {
    renderComponent({ hasPage: true });
    expect(screen.getByText("editor")).toBeInTheDocument();
    expect(screen.queryByText(t("home.selectPageOrCreate"))).not.toBeInTheDocument();
  });

  it("shows the tab bar above an open page", () => {
    renderComponent(
      { hasPage: true },
      {
        tabs: {
          items: [
            {
              key: "docs/a.md",
              page: {
                path: "docs/a.md",
                markdown: "# A",
                frontmatter: { ...emptyFrontmatter(), title: "Alpha" },
                savedAt: null,
                pageKind: "wiki",
                repoMode: "personal",
                publishEnabled: true,
                reviewable: true,
                prUrl: null,
              },
              focusThreadId: null,
              dirty: false,
            },
          ],
          activeKey: "docs/a.md",
          onActivateTab: vi.fn(),
          onCloseTab: vi.fn(),
        },
      },
    );
    expect(screen.getByRole("tab", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("editor")).toBeInTheDocument();
  });

  it("shows the process guide on read-only wiki blank", () => {
    renderComponent({ showProcessGuide: true, section: undefined });
    expect(screen.getByText(t("home.process.title"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.lede"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.publication.new") })).toBeInTheDocument();
    expect(screen.queryByLabelText(t("home.create.targetAria", { path: "/docs/prds" }))).not.toBeInTheDocument();
  });
});
