import { t } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { ChatBubble } from "../ChatBubble";

const mockUseHome = vi.fn();

vi.mock("../../../../home/components/Home/context", () => ({
  useHome: () => mockUseHome(),
}));

function stubHome({ open = false }: { open?: boolean } = {}) {
  return {
    chat: { open, onOpen: vi.fn(), onClose: vi.fn(), onToggle: vi.fn() },
    pagePath: null,
    pageHosts: { register: vi.fn(), unregister: vi.fn(), get: vi.fn(() => null) },
  };
}

describe("ChatBubble", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseHome.mockReturnValue(stubHome());
  });

  it("renders the launcher without the panel while closed", () => {
    renderWithProviders(<ChatBubble />);
    expect(screen.getByRole("button", { name: t("home.chat.bubble.open") })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("toggles open on launcher press", async () => {
    const home = stubHome();
    mockUseHome.mockReturnValue(home);
    renderWithProviders(<ChatBubble />);
    await userEvent.click(screen.getByRole("button", { name: t("home.chat.bubble.open") }));
    expect(home.chat.onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders the chat panel while open", () => {
    mockUseHome.mockReturnValue(stubHome({ open: true }));
    renderWithProviders(<ChatBubble />);
    expect(screen.getByRole("button", { name: t("home.chat.bubble.close") })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});