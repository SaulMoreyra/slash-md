import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../../../../../../../../test/render";
import { CreateIntent } from "../../../../../../enums";
import { useStageController } from "../useStageController";

const mockUseHome = vi.fn();

vi.mock("../../../../context", () => ({
  useHome: () => mockUseHome(),
}));

function stubHome(overrides: {
  pagePath?: string | null;
  section?: string;
  createIntent?: CreateIntent;
  payload?: { needsInit?: boolean } | null;
} = {}) {
  return {
    library: { payload: overrides.payload === undefined ? { needsInit: false } : overrides.payload },
    pagePath: overrides.pagePath ?? null,
    busy: false,
    error: null,
    children: null,
    nav: {
      section: overrides.section,
      createIntent: overrides.createIntent ?? CreateIntent.Page,
    },
    actions: {
      onRequestInit: vi.fn(),
      onCreatePage: vi.fn(),
      onRequestPublication: vi.fn(),
    },
    conflicts: {
      merging: false,
      status: "idle",
      editing: false,
      selected: null,
      onSyncWithWiki: vi.fn(),
      onOpenConflicts: vi.fn(),
    },
  };
}

describe("useStageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHome.mockReturnValue(stubHome());
  });

  const runHook = () => renderHook(() => useStageController());

  it("exposes blank-state fields for a folder without a page", () => {
    mockUseHome.mockReturnValue(stubHome({ section: "docs/prds" }));
    const { result } = runHook();
    expect(result.current.hasPage).toBe(false);
    expect(result.current.section).toBe("docs/prds");
    expect(result.current.loading).toBe(false);
    expect(result.current).not.toHaveProperty("showSectionCanvas");
    expect(result.current).not.toHaveProperty("folderTitle");
  });

  it("keeps template create intent from nav", () => {
    mockUseHome.mockReturnValue(
      stubHome({ section: "templates/foo", createIntent: CreateIntent.Template }),
    );
    const { result } = runHook();
    expect(result.current.createIntent).toBe(CreateIntent.Template);
    expect(result.current.section).toBe("templates/foo");
  });

  it("shows process guide on read-only workspace wiki", () => {
    mockUseHome.mockReturnValue({
      ...stubHome(),
      library: { payload: { needsInit: false }, canWrite: false },
      nav: {
        section: undefined,
        createIntent: CreateIntent.Page,
        isWorkspace: true,
      },
    });
    const { result } = runHook();
    expect(result.current.showProcessGuide).toBe(true);
  });

  it("hides process guide when the user can write", () => {
    mockUseHome.mockReturnValue({
      ...stubHome(),
      library: { payload: { needsInit: false }, canWrite: true },
      nav: {
        section: undefined,
        createIntent: CreateIntent.Page,
        isWorkspace: true,
      },
    });
    const { result } = runHook();
    expect(result.current.showProcessGuide).toBe(false);
  });
});
