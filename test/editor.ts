import { normalizeMarkdown } from "@slash-md/core/markdown";
import { createEditorState, readBoot, wantCommentsForBoot } from "../packages/ui/src/editor/context";
import { handleImageMessage } from "../packages/ui/src/editor/core/images";
import type { EditorContext } from "../packages/ui/src/editor/context";
import { isCoverColor, coverColorHex } from "../packages/ui/src/editor/hero/cover";
import { filterEmoji } from "../packages/ui/src/editor/hero/emojiCatalog";
import { placeThreads } from "../packages/ui/src/editor/plugins/commentsPlugin";

function mockBoot(): import("@slash-md/core/protocol").WebviewBoot {
  return {
    text: "# Hello\n",
    frontmatter: { title: "Hello" },
    imageMap: { "docs/a.png": "vscode-webview://x/existing.png" },
    init: {
      type: "init",
      path: "docs/test.md",
      kind: "draft",
      label: "draft",
      savedAt: new Date().toISOString(),
      publishEnabled: false,
      workflow: "workspace",
      repoMode: "workspace",
      pageKind: "wiki",
    },
  };
}

function mockEditorContext(): EditorContext {
  return {
    vscode: { postMessage: () => {}, getState: () => undefined, setState: () => {} },
    boot: mockBoot(),
    canvas: document.createElement("div"),
    wantComments: true,
    state: createEditorState(mockBoot()),
    handles: {
      bar: { applyStatus: () => {}, onSaved: () => {}, persist: () => {} },
      chrome: {
        showThread: () => {},
        setOrphans: () => {},
        setCanWrite: () => {},
        applyThreads: () => {},
        close: () => {},
        destroy: () => {},
      },
      reviewContext: { show: () => {}, hide: () => {} },
    },
    timers: {},
    post: () => {},
  };
}

export function runEditorTests(assert: (ok: boolean, message: string) => void): void {
  {
    assert(filterEmoji("smile").length > 0, "filterEmoji finds smileys");
    assert(isCoverColor("color:#E3E2E0"), "isCoverColor accepts solid cover");
    assert(coverColorHex("color:#E3E2E0") === "#E3E2E0", "coverColorHex parses hex");
    assert(!isCoverColor("images/hero.png"), "isCoverColor rejects image paths");
  }

  {
    const boot = mockBoot();
    (window as unknown as Window & { __SLASH_MD__: typeof boot }).__SLASH_MD__ = boot;
    assert(wantCommentsForBoot(boot), "wantCommentsForBoot for workspace wiki");
    assert(!wantCommentsForBoot({ ...boot, init: { ...boot.init, repoMode: "personal" } }), "wantCommentsForBoot false for personal");
    assert(readBoot().text === boot.text, "readBoot returns injected boot");
    assert(createEditorState(boot).lastSent === normalizeMarkdown(boot.text), "createEditorState normalizes text");
    assert(createEditorState(boot).imageMap["docs/a.png"] === "vscode-webview://x/existing.png", "createEditorState copies imageMap");
  }

  {
    const ctx = mockEditorContext();
    handleImageMessage(ctx, { type: "imageMap", map: { "docs/b.png": "vscode-webview://x/b.png" } });
    assert(ctx.state.imageMap["docs/b.png"] === "vscode-webview://x/b.png", "handleImageMessage merges imageMap");
  }

  {
    const placements = placeThreads(
      {
        textBetween: () => "hello world",
        content: { size: 11 },
      } as never,
      [
        {
          id: "t1",
          snippet: "hello",
          isResolved: false,
          comments: [],
        },
      ],
    );
    assert(placements.length === 1, "placeThreads returns placement for snippet");
  }
}
