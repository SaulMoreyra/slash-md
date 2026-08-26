import type { FrontmatterKey } from "@slash-md/core/protocol";
import { routeEditorMessage } from "../apps/vscode/src/editor/editorMessageRouter";
import type { EditorSessionDeps, EditorSessionState } from "../apps/vscode/src/editor/editorSessionDeps";

function mockDeps(overrides: Partial<EditorSessionDeps> = {}): {
  deps: EditorSessionDeps;
  calls: string[];
  state: EditorSessionState;
} {
  const calls: string[] = [];
  const state: EditorSessionState = {
    latestText: "---\ntitle: A\n---\n\nbody\n",
    saveTimer: undefined,
    persisting: false,
  };
  const deps: EditorSessionDeps = {
    state,
    frontmatterKeys: new Set<FrontmatterKey>(["title", "icon", "cover", "coverPosition"]),
    applyEdit: (body) => {
      calls.push(`applyEdit:${body.slice(0, 20)}`);
    },
    applyFrontmatter: (field, value) => {
      calls.push(`applyFrontmatter:${field}=${value}`);
    },
    persistSoon: () => {
      calls.push("persistSoon");
    },
    uploadImage: async (msg) => {
      calls.push(`uploadImage:${msg.id}`);
    },
    resolveImage: async (msg) => {
      calls.push(`resolveImage:${msg.id}`);
    },
    openUrl: async (url) => {
      calls.push(`openUrl:${url}`);
    },
    ...overrides,
  };
  return { deps, calls, state };
}

export async function runEditorRouterTests(assert: (ok: boolean, message: string) => void): Promise<void> {
  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, {});
    assert(calls.length === 0, "routeEditorMessage ignores message without type");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "edit", text: "hello" });
    assert(calls.includes("applyEdit:hello") && calls.includes("persistSoon"), "routeEditorMessage edit schedules persist");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "frontmatter", field: "title", value: "Nuevo" });
    assert(
      calls.includes("applyFrontmatter:title=Nuevo") && calls.includes("persistSoon"),
      "routeEditorMessage frontmatter patches title",
    );
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "frontmatter", field: "status", value: "published" });
    assert(calls.length === 0, "routeEditorMessage rejects non-editable frontmatter keys");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "threadsRefresh" });
    assert(calls.length === 0, "routeEditorMessage ignores review threads in the editor-only host");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "review", text: "body" });
    assert(calls.length === 0, "routeEditorMessage ignores review/publish in the editor-only host");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "openUrl", url: "https://example.com" });
    assert(calls.includes("openUrl:https://example.com"), "routeEditorMessage openUrl delegates");
  }
}
