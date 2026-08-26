import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../../../test/render";
import { ShortcutKbd, shortcutLabel, type ShortcutKbdProps } from "../index";

describe("ShortcutKbd", () => {
  const defaultProps: ShortcutKbdProps = { keys: "⌘K" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ShortcutKbdProps> = {}) =>
    renderWithProviders(<ShortcutKbd {...defaultProps} {...props} />);

  it("renders the shortcut keys", () => {
    renderComponent();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("exposes platform-aware shortcutLabel helpers", () => {
    expect(shortcutLabel.escape()).toBe("Esc");
    expect(shortcutLabel.search()).toMatch(/K$/);
    expect(shortcutLabel.publications()).toMatch(/4$/);
    expect(shortcutLabel.toggleRail()).toMatch(/\\$/);
    expect(shortcutLabel.togglePane()).toMatch(/\\$/);
  });
});
