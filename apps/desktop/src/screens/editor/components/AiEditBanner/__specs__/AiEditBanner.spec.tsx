import { t } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { AiEditBanner } from "../AiEditBanner";

const mockUseEditor = vi.fn();

vi.mock("../../Editor/context", () => ({
  useEditor: () => mockUseEditor(),
}));

function stubAi(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    streaming: false,
    partial: false,
    revert: vi.fn(),
    apply: vi.fn(),
    ...overrides,
  };
}

describe("AiEditBanner", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseEditor.mockReturnValue({ ai: stubAi() });
  });

  it("renders nothing while no edit is active", () => {
    mockUseEditor.mockReturnValue({ ai: stubAi({ active: false }) });
    renderWithProviders(<AiEditBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the streaming copy while writing", () => {
    mockUseEditor.mockReturnValue({ ai: stubAi({ streaming: true }) });
    renderWithProviders(<AiEditBanner />);
    expect(screen.getByText(t("editor.aiEditBanner.streaming"))).toBeInTheDocument();
  });

  it("shows the partial copy when the session was interrupted", () => {
    mockUseEditor.mockReturnValue({ ai: stubAi({ partial: true }) });
    renderWithProviders(<AiEditBanner />);
    expect(screen.getByText(t("editor.aiEditBanner.partial"))).toBeInTheDocument();
  });

  it("shows the ready copy on a clean finish", () => {
    renderWithProviders(<AiEditBanner />);
    expect(screen.getByText(t("editor.aiEditBanner.ready"))).toBeInTheDocument();
  });

  it("exposes apply and discard actions", () => {
    renderWithProviders(<AiEditBanner />);
    expect(screen.getByText(t("editor.aiEditBanner.apply"))).toBeInTheDocument();
    expect(screen.getByText(t("editor.aiEditBanner.discard"))).toBeInTheDocument();
  });
});