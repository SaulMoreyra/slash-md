import { describe, expect, it } from "vitest";
import { menuCopy, menuLocale } from "../menu";

describe("menuLocale", () => {
  it("maps Spanish OS locales to es", () => {
    expect(menuLocale("es")).toBe("es");
    expect(menuLocale("es-MX")).toBe("es");
    expect(menuLocale("ES-es")).toBe("es");
  });

  it("falls back to English", () => {
    expect(menuLocale("en")).toBe("en");
    expect(menuLocale("en-US")).toBe("en");
    expect(menuLocale("fr-FR")).toBe("en");
  });
});

describe("menuCopy", () => {
  it("uses SlashMD-facing File actions in English", () => {
    const copy = menuCopy("en");
    expect(copy.openFolder).toBe("Open Folder…");
    expect(copy.closePage).toBe("Close Page");
    expect(copy.settings).toBe("Settings…");
  });

  it("uses SlashMD-facing File actions in Spanish", () => {
    const copy = menuCopy("es");
    expect(copy.openFolder).toBe("Abrir carpeta…");
    expect(copy.closePage).toBe("Cerrar página");
    expect(copy.settings).toBe("Configuración…");
  });
});
