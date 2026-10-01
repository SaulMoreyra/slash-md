import { describe, it, expect } from "vitest";
import type { HomeTreePayload, PagePayload, WorkspaceInfo } from "../../../shared/api";
import { AppPhase } from "../enums";
import { pageTrail, resolveAppPhase, toErrorMessage } from "../utils";

const emptyWorkspace = (root: string | null): WorkspaceInfo => ({
  root,
  config: null,
  slashmd: {},
  needsInit: !root,
  mcpUrl: null,
  auth: null,
  theme: "dark",
});

describe("resolveAppPhase", () => {
  it("returns loading when workspace is missing", () => {
    expect(resolveAppPhase(null)).toBe(AppPhase.Loading);
  });

  it("returns welcome when there is no folder", () => {
    expect(resolveAppPhase(emptyWorkspace(null))).toBe(AppPhase.Welcome);
  });

  it("returns workspace when a folder is open", () => {
    expect(resolveAppPhase(emptyWorkspace("/docs"))).toBe(AppPhase.Workspace);
  });
});

describe("pageTrail", () => {
  it("returns empty without page or tree", () => {
    expect(pageTrail(null, null)).toBe("");
  });

  it("finds the trail for the open page", () => {
    const page = { path: "guide/intro.md" } as PagePayload;
    const tree = {
      roots: [
        {
          kind: "folder",
          path: "guide",
          title: "Guide",
          children: [{ kind: "file", path: "guide/intro.md", title: "Intro" }],
        },
      ],
    } as HomeTreePayload;
    expect(pageTrail(page, tree)).toBe("Guide");
  });
});

describe("toErrorMessage", () => {
  it("reads Error.message", () => {
    expect(toErrorMessage(new Error("nope"))).toBe("nope");
  });

  it("strips Electron IPC wrapping", () => {
    expect(toErrorMessage(new Error("Error invoking remote method 'publishBatch': Error: needs approval"))).toBe(
      "needs approval",
    );
  });
});
