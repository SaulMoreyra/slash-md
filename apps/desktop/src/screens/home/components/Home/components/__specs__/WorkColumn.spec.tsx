import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../../test/render";
import { NavKind } from "../../../../enums";
import type { HomeControllerApi } from "../../../../hooks/useHomeController";
import { WorkColumn } from "../WorkColumn";

const mockUseHome = vi.fn();

vi.mock("../../context", () => ({
  useHome: () => mockUseHome(),
}));

vi.mock("../../../WorkPane", () => ({
  WorkPane: () => <div data-testid="work-pane" />,
}));

function stubHome(overrides: { workPaneOpen?: boolean; kind?: NavKind } = {}) {
  const kind = overrides.kind ?? NavKind.Drafts;
  return {
    nav: {
      workPaneOpen: overrides.workPaneOpen ?? true,
      view: kind === NavKind.Folder ? { kind, path: "docs", title: "docs" } : { kind },
      onCloseWorkPane: vi.fn(),
    },
    library: { payload: null, personal: false, trails: new Map() },
    pagePath: null,
    busy: false,
    runOp: vi.fn(),
    actions: {
      onRequestReview: vi.fn(),
      onRequestSignIn: vi.fn(),
      onRequestNewPage: vi.fn(),
      onRequestPublication: vi.fn(),
      onRequestDiscard: vi.fn(),
      onLeavePublication: vi.fn(),
      onPublishBatch: vi.fn(),
      onLandPublication: vi.fn(),
    },
    conflicts: {},
    onRefresh: vi.fn(),
    onOpenPage: vi.fn(),
    onClosePage: vi.fn(),
  } as unknown as HomeControllerApi;
}

describe("WorkColumn", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseHome.mockReturnValue(stubHome());
  });

  it("renders the work pane for drafts", () => {
    renderWithProviders(<WorkColumn />);
    expect(screen.getByLabelText(t("home.workList"))).toBeInTheDocument();
    expect(screen.getByTestId("work-pane")).toBeInTheDocument();
  });

  it("hides the work pane when a folder is selected", () => {
    mockUseHome.mockReturnValue(stubHome({ kind: NavKind.Folder, workPaneOpen: true }));
    renderWithProviders(<WorkColumn />);
    expect(screen.queryByLabelText(t("home.workList"))).not.toBeInTheDocument();
    expect(screen.queryByTestId("work-pane")).not.toBeInTheDocument();
  });

  it("hides the work pane when it is closed", () => {
    mockUseHome.mockReturnValue(stubHome({ workPaneOpen: false }));
    renderWithProviders(<WorkColumn />);
    expect(screen.queryByTestId("work-pane")).not.toBeInTheDocument();
  });
});
