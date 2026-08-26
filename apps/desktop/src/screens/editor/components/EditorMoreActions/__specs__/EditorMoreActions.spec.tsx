import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { PagePayload } from "../../../../../../shared/api";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { LifecycleKind } from "../../../enums";
import { EditorMoreActions } from "../EditorMoreActions";

function mockPage(overrides: Partial<PagePayload> = {}): PagePayload {
  return {
    path: "docs/a.md",
    markdown: "",
    frontmatter: emptyFrontmatter(),
    savedAt: null,
    pageKind: "wiki",
    repoMode: "local",
    publishEnabled: false,
    reviewable: false,
    prUrl: null,
    ...overrides,
  };
}

describe("EditorMoreActions", () => {
  const onCloseMore = vi.fn();
  const onFlushSave = vi.fn(async () => undefined);
  const onOpenReviewModal = vi.fn();
  const onPublishPersonal = vi.fn(async () => undefined);

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows no-extra-actions for local mode", () => {
    renderWithProviders(
      <EditorMoreActions
        page={mockPage({ repoMode: "local" })}
        busy={false}
        lifecycle={{ kind: LifecycleKind.Draft }}
        openPr={null}
        reviewable={false}
        onCloseMore={onCloseMore}
        onFlushSave={onFlushSave}
        onOpenReviewModal={onOpenReviewModal}
        onPublishPersonal={onPublishPersonal}
      />,
    );
    expect(screen.getByText(t("editor.noExtraActions"))).toBeInTheDocument();
  });

  it("publishes personal pages", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditorMoreActions
        page={mockPage({ repoMode: "personal" })}
        busy={false}
        lifecycle={{ kind: LifecycleKind.Draft }}
        openPr={null}
        reviewable={false}
        onCloseMore={onCloseMore}
        onFlushSave={onFlushSave}
        onOpenReviewModal={onOpenReviewModal}
        onPublishPersonal={onPublishPersonal}
      />,
    );
    await user.click(screen.getByRole("button", { name: t("editor.publish") }));
    expect(onCloseMore).toHaveBeenCalled();
    expect(onFlushSave).toHaveBeenCalled();
    expect(onPublishPersonal).toHaveBeenCalled();
  });
});
