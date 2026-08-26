import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, userEvent } from "../../test/render";
import { useTheme } from "../context";
import { ThemeProvider } from "../ThemeProvider";

function Probe() {
  const { theme, setTheme, source } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="source">{source}</span>
      <button type="button" onClick={() => setTheme("light")}>
        light
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  const setTheme = vi.fn();
  const onTheme = vi.fn(() => () => undefined);

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
    document.body.className = "";
    window.__SLASHMD_INITIAL_THEME__ = null;
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { setTheme, onTheme },
    });
  });

  it("exposes the DOM snapshot on first render", () => {
    document.documentElement.dataset.theme = "light";
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("persists a user toggle through IPC", async () => {
    const user = userEvent.setup();
    document.documentElement.dataset.theme = "dark";
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "light" }));
    expect(setTheme).toHaveBeenCalledWith("light");
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("source")).toHaveTextContent("user");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
