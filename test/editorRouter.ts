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
    reviewing: false,
    persisting: false,
  };
  const deps: EditorSessionDeps = {
    state,
    workflow: "workspace",
    pageKind: "wiki",
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
    flushSaveTimer: () => {
      calls.push("flushSaveTimer");
    },
    persistNow: async () => {
      calls.push("persistNow");
    },
    refreshThreads: async () => {
      calls.push("refreshThreads");
    },
    threadReply: async (id, body) => {
      calls.push(`threadReply:${id}:${body}`);
    },
    threadResolve: async (id, resolved) => {
      calls.push(`threadResolve:${id}:${resolved}`);
    },
    threadCreate: async (text) => {
      calls.push(`threadCreate:${text}`);
    },
    uploadImage: async (msg) => {
      calls.push(`uploadImage:${msg.id}`);
    },
    resolveImage: async (msg) => {
      calls.push(`resolveImage:${msg.id}`);
    },
    reviewOrPublish: async (kind) => {
      calls.push(`reviewOrPublish:${kind}`);
    },
    openUrl: async (url) => {
      calls.push(`openUrl:${url}`);
    },
    refreshLabels: () => {
      calls.push("refreshLabels");
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
    assert(calls.includes("refreshThreads"), "routeEditorMessage threadsRefresh delegates");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "threadCreate", selectedText: "snip" });
    assert(
      calls.includes("flushSaveTimer") && calls.includes("persistNow") && calls.includes("threadCreate:snip"),
      "routeEditorMessage threadCreate flushes then creates",
    );
  }

  {
    const { deps, calls, state } = mockDeps();
    await routeEditorMessage(deps, { type: "review", text: "body" });
    assert(
      calls.includes("flushSaveTimer") &&
        calls.includes("applyEdit:body") &&
        calls.includes("persistNow") &&
        calls.includes("reviewOrPublish:review") &&
        calls.includes("refreshLabels") &&
        state.reviewing === false,
      "routeEditorMessage review persists and publishes via Home/sidecar",
    );
  }

  {
    const { deps, calls } = mockDeps({ workflow: "editor" });
    await routeEditorMessage(deps, { type: "publish" });
    assert(calls.length === 0, "routeEditorMessage ignores review/publish in editor workflow");
  }

  {
    const { deps, calls, state } = mockDeps();
    state.reviewing = true;
    await routeEditorMessage(deps, { type: "publish" });
    assert(calls.length === 0, "routeEditorMessage ignores concurrent review/publish");
  }

  {
    const { deps, calls } = mockDeps();
    await routeEditorMessage(deps, { type: "openUrl", url: "https://example.com" });
    assert(calls.includes("openUrl:https://example.com"), "routeEditorMessage openUrl delegates");
  }
}
