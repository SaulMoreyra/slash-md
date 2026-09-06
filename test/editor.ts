import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import { createEditorState, readBoot, wantCommentsForBoot } from "../packages/ui/src/editor/context";
import { handleImageMessage } from "../packages/ui/src/editor/core/images";
import type { EditorContext } from "../packages/ui/src/editor/context";
import { isCoverColor, coverColorHex } from "../packages/ui/src/editor/hero/cover";
import { filterEmoji } from "../packages/ui/src/editor/hero/emojiCatalog";
import { placeThreads } from "../packages/ui/src/editor/plugins/commentsPlugin";
import {
  clampActiveIndex,
  findLiteralMatches,
  nextActiveIndex,
  prevActiveIndex,
  toSearchState,
} from "../packages/ui/src/editor/plugins/searchMatch";
import { promoteLiteralTaskItems } from "../packages/ui/src/editor/plugins/taskList";

function mockBoot(): import("@slash-md/core/protocol").WebviewBoot {
  return {
    text: "# Hello\n",
    frontmatter: { ...emptyFrontmatter(), title: "Hello" },
    imageMap: { "docs/a.png": "vscode-webview://x/existing.png" },
    init: {
      type: "init",
      title: "Hello",
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
      bar: {
        applyStatus: () => {},
        onSaved: () => {},
        persist: () => {},
        onHostMessage: () => {},
      },
      chrome: {
        showThread: () => {},
        setOrphans: () => {},
        setCanWrite: () => {},
        applyThreads: () => {},
        close: () => {},
        destroy: () => {},
      },
      reviewContext: { show: () => {}, hide: () => {} },
      pageChrome: {
        bar: { onHostMessage: () => {} },
        frontmatter: { apply: () => {} },
        icon: { apply: () => {} },
        cover: { apply: () => {}, onHostMessage: () => {} },
        edited: { apply: () => {}, onHostMessage: () => {} },
      },
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
          path: "docs/test.md",
          line: 1,
          startLine: 1,
          diffSide: "RIGHT",
          url: "https://github.com/example/pr/1",
          snippet: "hello",
          isResolved: false,
          comments: [],
        },
      ],
    );
    assert(placements.length === 1, "placeThreads returns placement for snippet");
  }

  {
    const hits = findLiteralMatches("Hello HELLO world", "hello");
    assert(hits.length === 2, "findLiteralMatches is case-insensitive");
    assert(hits[0]!.from === 0 && hits[0]!.to === 5, "findLiteralMatches preserves query length");
    assert(findLiteralMatches("abab", "ab").length === 2, "findLiteralMatches finds overlapping hits");
    assert(findLiteralMatches("a.a", ".").length === 1, "findLiteralMatches treats query as literal");
    assert(nextActiveIndex(1, 3) === 2, "nextActiveIndex wraps forward");
    assert(nextActiveIndex(2, 3) === 0, "nextActiveIndex wraps from last to first");
    assert(prevActiveIndex(0, 3) === 2, "prevActiveIndex wraps from first to last");
    assert(clampActiveIndex(4, 2) === 1, "clampActiveIndex clamps high index");
    assert(toSearchState("foo", [{ from: 0, to: 3 }], 0).active === 1, "toSearchState is 1-based");
    assert(toSearchState("foo", [], -1).active === 0, "toSearchState active is 0 when empty");
  }

  {
    const empty = {
      type: "listItem",
      checked: null as boolean | null,
      children: [{ type: "paragraph", children: [{ type: "text", value: "[ ]" }] }],
    };
    const withText = {
      type: "listItem",
      checked: null as boolean | null,
      children: [{ type: "paragraph", children: [{ type: "text", value: "[x] done" }] }],
    };
    promoteLiteralTaskItems(empty);
    promoteLiteralTaskItems(withText);
    assert(empty.checked === false, "bare [ ] list item becomes unchecked task");
    assert(withText.checked === true, "[x] prefix becomes checked task");
    assert(withText.children[0]!.children[0]!.value === "done", "[x] prefix is stripped from task text");
  }
}
