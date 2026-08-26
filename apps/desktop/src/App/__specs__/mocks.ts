import { vi } from "vitest";
import type { AppControllerApi } from "../hooks/useAppController";
import { AppPhase } from "../enums";

export function buildMockAppController(
  overrides: Partial<AppControllerApi> = {},
): AppControllerApi {
  return {
    phase: overrides.phase ?? AppPhase.Loading,
    session: {
      workspace: null,
      tree: null,
      page: null,
      trail: "",
      focusThreadId: null,
      ...overrides.session,
    },
    chrome: {
      busy: false,
      error: null,
      ...overrides.chrome,
    },
    actions: {
      onRefresh: vi.fn(async () => undefined),
      onError: vi.fn(),
      onOpenPage: vi.fn(async () => undefined),
      onClosePage: vi.fn(),
      onPage: vi.fn(),
      onOpenFolder: vi.fn(),
      onOpenPath: vi.fn(),
      onChangeFolder: vi.fn(),
      onCloseWorkspace: vi.fn(),
      ...overrides.actions,
    },
    run: (overrides.run ?? vi.fn(async (fn) => fn())) as AppControllerApi["run"],
  };
}
