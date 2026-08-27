import { vi } from "vitest";
import type { AppControllerApi } from "../hooks/useAppController";
import { AppPhase } from "../enums";

type MockOverrides = Omit<Partial<AppControllerApi>, "session" | "chrome" | "operations" | "actions"> & {
  session?: Partial<AppControllerApi["session"]>;
  chrome?: Partial<AppControllerApi["chrome"]>;
  operations?: Partial<AppControllerApi["operations"]>;
  actions?: Partial<AppControllerApi["actions"]>;
};

export function buildMockAppController(overrides: MockOverrides = {}): AppControllerApi {
  return {
    phase: overrides.phase ?? AppPhase.Loading,
    session: {
      workspace: null,
      tree: null,
      git: { branch: null },
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
    operations: {
      busy: false,
      operation: null,
      pending: 0,
      error: null,
      runOp: vi.fn(async (_op, fn) => fn()),
      refresh: vi.fn(async () => undefined),
      git: { branch: null },
      onGit: vi.fn(),
      onSyncGit: vi.fn(async () => undefined),
      ...overrides.operations,
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
  };
}
