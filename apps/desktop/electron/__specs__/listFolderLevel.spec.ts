import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// workspace.ts reaches Electron only through session.ts, for the userData path.
vi.mock("electron", () => ({
  app: { getPath: () => os.tmpdir() },
  safeStorage: { isEncryptionAvailable: () => false },
}));

const { listFolderLevel } = await import("../workspace");

let root: string;

async function write(relative: string, body = "# hi\n") {
  const abs = path.join(root, relative);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body, "utf8");
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "slashmd-level-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("listFolderLevel", () => {
  it("returns the markdown directly inside the folder", async () => {
    await write("docs/one.md");
    await write("docs/two.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/one.md", "docs/two.md"]);
  });

  it("does not descend past the requested level", async () => {
    await write("docs/deep/nested/page.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes).toEqual([{ kind: "folder", path: "docs/deep", title: "deep" }]);
    // The whole point: children are left for whoever opens the folder.
    expect(nodes[0]?.children).toBeUndefined();
  });

  it("shows a folder whose markdown is buried several levels down", async () => {
    await write("docs/a/b/c/page.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/a"]);
  });

  it("hides a folder that holds no markdown at all", async () => {
    await write("docs/keep/page.md");
    await fs.mkdir(path.join(root, "docs/empty/deeper"), { recursive: true });
    await fs.writeFile(path.join(root, "docs/empty/notes.txt"), "x", "utf8");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/keep"]);
  });

  it("never walks into node_modules", async () => {
    await write("docs/node_modules/some-dep/README.md");
    await write("docs/real.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/real.md"]);
  });

  it("skips the other heavy build directories too", async () => {
    for (const dir of ["dist", "build", "target", "vendor", "coverage", "tmp"]) {
      await write(`docs/${dir}/generated.md`);
    }
    await write("docs/real.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/real.md"]);
  });

  it("skips dotfolders", async () => {
    await write("docs/.hidden/page.md");
    await write("docs/real.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/real.md"]);
  });

  it("ignores the generated .slash.md siblings", async () => {
    await write("docs/page.md");
    await write("docs/page.slash.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.path)).toEqual(["docs/page.md"]);
  });

  it("keeps a configured section visible while it is still empty", async () => {
    await fs.mkdir(path.join(root, "docs/decisions"), { recursive: true });

    const nodes = await listFolderLevel(root, "docs", ["docs/decisions"]);

    expect(nodes.map((node) => node.path)).toEqual(["docs/decisions"]);
  });

  it("lists folders before files", async () => {
    await write("docs/a-page.md");
    await write("docs/z-folder/page.md");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes.map((node) => node.kind)).toEqual(["folder", "file"]);
  });

  it("reads the page title out of the markdown", async () => {
    await write("docs/slug.md", "# Real Title\n\nbody\n");

    const nodes = await listFolderLevel(root, "docs");

    expect(nodes[0]?.title).toBe("Real Title");
  });

  it("returns nothing for a folder that is not there", async () => {
    expect(await listFolderLevel(root, "docs/missing")).toEqual([]);
  });

  it("treats a repo-root content path as the workspace root", async () => {
    await write("top.md");
    await write("child/page.md");

    const nodes = await listFolderLevel(root, ".");

    expect(nodes.map((node) => node.path)).toEqual(["child", "top.md"]);
  });
});
