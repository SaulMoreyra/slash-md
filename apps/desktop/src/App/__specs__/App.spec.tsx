import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../test/render";
import { App } from "../App";
import { AppPhase } from "../enums";
import { buildMockAppController } from "./mocks";

const mockUseAppController = vi.fn();

vi.mock("../hooks/useAppController", () => ({
  useAppController: () => mockUseAppController(),
}));

vi.mock("../../screens/Welcome", () => ({
  WelcomeScreen: () => <div>welcome-stub</div>,
}));

vi.mock("../../screens/home", () => ({
  HomeScreen: ({ children }: { children: ReactNode }) => (
    <div>
      home-stub
      {children}
    </div>
  ),
}));

vi.mock("../../screens/editor", () => ({
  EditorScreen: () => <div>editor-stub</div>,
}));

describe("App", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseAppController.mockReturnValue(buildMockAppController());
  });

  it("shows loading splash when workspace is not ready", () => {
    renderWithProviders(<App />);
    expect(screen.getByText(t("app.loading"))).toBeInTheDocument();
  });

  it("shows welcome when workspace has no root", () => {
    mockUseAppController.mockReturnValue(
      buildMockAppController({
        phase: AppPhase.Welcome,
        session: {
          workspace: {
            root: null,
            config: null,
            slashmd: {},
            needsInit: true,
            mcpUrl: null,
            auth: null,
            theme: "dark",
          },
          tree: null,
          page: null,
          trail: "",
          focusThreadId: null,
        },
      }),
    );
    renderWithProviders(<App />);
    expect(screen.getByText("welcome-stub")).toBeInTheDocument();
  });

  it("shows workspace when a folder is open", () => {
    mockUseAppController.mockReturnValue(
      buildMockAppController({
        phase: AppPhase.Workspace,
        session: {
          workspace: {
            root: "/docs",
            config: null,
            slashmd: {},
            needsInit: false,
            mcpUrl: null,
            auth: null,
            theme: "dark",
          },
          tree: null,
          page: null,
          trail: "",
          focusThreadId: null,
        },
      }),
    );
    renderWithProviders(<App />);
    expect(screen.getByText("home-stub")).toBeInTheDocument();
  });
});
