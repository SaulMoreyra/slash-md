import { describe, it, expect, beforeEach } from "vitest";
import { ThemeSource } from "../enums";
import { applyTheme, getThemeSnapshot, resolveThemeSource } from "../theme";

describe("theme", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
    document.body.className = "";
    window.__SLASHMD_INITIAL_THEME__ = null;
  });

  it("toggles html and body classes for light and dark", () => {
    applyTheme("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.body.classList.contains("vscode-light")).toBe(true);
    expect(document.body.classList.contains("vscode-dark")).toBe(false);

    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.body.classList.contains("vscode-dark")).toBe(true);
    expect(document.body.classList.contains("vscode-light")).toBe(false);
  });

  it("reads the snapshot from the DOM first", () => {
    document.documentElement.dataset.theme = "light";
    expect(getThemeSnapshot()).toBe("light");
  });

  it("treats a preload theme as a user choice", () => {
    window.__SLASHMD_INITIAL_THEME__ = "light";
    expect(resolveThemeSource()).toBe(ThemeSource.User);
  });

  it("treats missing preload as OS", () => {
    expect(resolveThemeSource()).toBe(ThemeSource.Os);
  });
});
