import { describe, it, expect } from "vitest";
import { resolveCreateTarget } from "@slash-md/core/createPath";
import { formatCreateFilePath, formatFolderPath, formatCreatePaths } from "../utils";

describe("formatFolderPath", () => {
  it.each([
    { section: undefined, path: "/" },
    { section: "docs", path: "/docs" },
    { section: "docs/prds", path: "/docs/prds" },
  ])("formats $section as $path", ({ section, path }) => {
    expect(formatFolderPath(section)).toBe(path);
  });
});

describe("formatCreateFilePath", () => {
  it.each([
    { section: undefined, title: "", untitled: "Sin título", path: "/sin-titulo.md" },
    { section: undefined, title: "Hello", untitled: "Untitled", path: "/hello.md" },
    { section: "docs", title: "", untitled: "Untitled", path: "/docs/untitled.md" },
    { section: "docs/prds", title: "Hello world", untitled: "Untitled", path: "/docs/prds/hello-world.md" },
    { section: "docs/prds", title: "/read/templates.md", untitled: "Untitled", path: "/docs/prds/read/templates.md" },
    { section: "docs/prds", title: "read/templates.md", untitled: "Untitled", path: "/docs/prds/read/templates.md" },
    { section: "docs/prds", title: "read/", untitled: "Untitled", path: "/docs/prds/read/untitled.md" },
    { section: undefined, title: "guides/intro.md", untitled: "Untitled", path: "/guides/intro.md" },
    { section: "docs/prds", title: "../secret.md", untitled: "Untitled", path: "/docs/prds/secret.md" },
  ])("formats $section + $title as $path", ({ section, title, untitled, path }) => {
    expect(formatCreateFilePath(section, title, untitled)).toBe(path);
  });
});

describe("formatCreatePaths", () => {
  it("updates the folder heading when the title nests a subfolder", () => {
    expect(formatCreatePaths("docs/prds", "/read/templates.md", "Untitled")).toEqual({
      folderPath: "/docs/prds/read",
      filePath: "/docs/prds/read/templates.md",
    });
  });
});

describe("resolveCreateTarget", () => {
  it("nests a subfolder under the current section", () => {
    expect(resolveCreateTarget("docs/prds", "/read/templates.md", "Untitled")).toEqual({
      section: "docs/prds/read",
      title: "templates",
      slug: "templates",
    });
  });

  it("uses untitled inside a trailing slash folder", () => {
    expect(resolveCreateTarget("docs", "read/", "Sin título")).toEqual({
      section: "docs/read",
      title: "Sin título",
      slug: "sin-titulo",
    });
  });
});
