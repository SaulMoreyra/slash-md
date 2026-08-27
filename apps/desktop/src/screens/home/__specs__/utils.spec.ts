import { describe, it, expect, vi, afterEach } from "vitest";
import { t } from "i18next";
import { mockPayload } from "../__fixtures__/home";
import { CreateIntent, ModalKind, PublicationCta, PublicationKind, PublicationStatusTone, PrCheckStatus, PublishBlocker } from "../enums";
import {
  createIntentForSection,
  isPublishReady,
  inReviewDrafts,
  isPublicationsPaneEmpty,
  loteReviewFromPayload,
  newPageModalKind,
  prCheckStatus,
  publicationCta,
  copyToClipboard,
  publicationKindLabel,
  publicationRowsForList,
  publicationStatusLine,
  publicationStatusTone,
  publicationChangeCount,
  publishBlockerFromError,
  publishErrorCopy,
  badgeChip,
  settingsModalKind,
} from "../utils";

describe("createIntentForSection", () => {
  it("creates a page at the library root", () => {
    expect(createIntentForSection(undefined, ".", undefined)).toBe(CreateIntent.Page);
  });

  it("creates a template inside templates/", () => {
    expect(createIntentForSection("templates", ".", undefined)).toBe(CreateIntent.Template);
  });

  it("creates a template in a nested templates folder", () => {
    expect(createIntentForSection("templates/legal", ".", undefined)).toBe(CreateIntent.Template);
  });

  it("creates a page in a normal folder", () => {
    expect(createIntentForSection("producto", ".", undefined)).toBe(CreateIntent.Page);
  });

  it("uses the configured templatesPath only", () => {
    expect(createIntentForSection("templates", "docs", "team/tpl")).toBe(CreateIntent.Page);
    expect(createIntentForSection("team/tpl", "docs", "team/tpl")).toBe(CreateIntent.Template);
  });
});

describe("newPageModalKind", () => {
  it("opens init when the workspace is not ready", () => {
    expect(newPageModalKind(true, true, true)).toBe(ModalKind.Init);
  });

  it("opens a publication when the wiki is read-only", () => {
    expect(newPageModalKind(false, true, false)).toBe(ModalKind.Publication);
  });

  it("opens the new page form otherwise", () => {
    expect(newPageModalKind(false, false, true)).toBe(ModalKind.New);
  });
});

describe("settingsModalKind", () => {
  it("opens init or config from the same shortcut", () => {
    expect(settingsModalKind(true)).toBe(ModalKind.Init);
    expect(settingsModalKind(false)).toBe(ModalKind.Config);
  });
});

describe("publicationKindLabel", () => {
  it("maps each kind to i18n copy", () => {
    expect(publicationKindLabel(t, PublicationKind.Draft)).toBe(t("home.publication.kindDraft"));
    expect(publicationKindLabel(t, PublicationKind.InReview)).toBe(t("home.publication.kindInReview"));
    expect(publicationKindLabel(t, PublicationKind.Published)).toBe(t("home.publication.kindPublished"));
  });
});

describe("publicationRowsForList", () => {
  it("hides the mounted publication when a current card is shown", () => {
    const rows = publicationRowsForList(
      [
        { title: "Now", branch: "a", kind: "draft", mounted: true },
        { title: "Other", branch: "b", kind: "in_review", mounted: false },
      ],
      true,
    );
    expect(rows).toEqual([{ title: "Other", branch: "b", kind: "in_review", mounted: false }]);
  });

  it("does not invent a row when HEAD is a publication missing from the list", () => {
    const rows = publicationRowsForList(
      [{ title: "Mine", branch: "b", kind: "draft", mounted: false }],
      true,
    );
    expect(rows).toEqual([{ title: "Mine", branch: "b", kind: "draft", mounted: false }]);
  });
});

describe("prCheckStatus", () => {
  it("maps check rollup to an enum", () => {
    expect(prCheckStatus(true)).toBe(PrCheckStatus.Ok);
    expect(prCheckStatus(false)).toBe(PrCheckStatus.Failing);
    expect(prCheckStatus(null)).toBe(PrCheckStatus.Pending);
  });
});

describe("isPublicationsPaneEmpty", () => {
  it("is empty without publications or review", () => {
    expect(isPublicationsPaneEmpty(mockPayload())).toBe(true);
  });

  it("is not empty when a PR or in-review page exists", () => {
    expect(
      isPublicationsPaneEmpty(
        mockPayload({
          loteReview: {
            prNumber: 1,
            prUrl: "",
            title: "Onboarding",
            branch: "pub/onboarding",
            reviewers: [],
            checksOk: true,
            approvals: 1,
            state: "open",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isPublicationsPaneEmpty(mockPayload({ drafts: [{ path: "docs/a.md", title: "A", badge: "in review" }] })),
    ).toBe(false);
    expect(inReviewDrafts(mockPayload({ drafts: [{ path: "docs/a.md", title: "A", badge: "in review" }] }))).toHaveLength(
      1,
    );
  });
});

describe("loteReviewFromPayload", () => {
  it("falls back to the publication PR", () => {
    const review = loteReviewFromPayload(
      mockPayload({
        publication: {
          title: "Onboarding",
          branch: "pub/onboarding",
          kind: "in_review",
          prNumber: 9,
          prUrl: "https://example.com/9",
        },
      }),
    );
    expect(review?.prNumber).toBe(9);
    expect(review?.title).toBe("Onboarding");
  });
});

describe("publicationStatusLine", () => {
  const readyReview = {
    prNumber: 1,
    prUrl: "",
    title: "Onboarding",
    branch: "pub/onboarding",
    reviewers: ["ada"],
    checksOk: true as boolean | null,
    approvals: 1,
    state: "open" as const,
  };

  it("prefers wiki sync copy over review state", () => {
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: true,
        wikiSyncStatus: "behind",
        loteReview: readyReview,
      }),
    ).toBe(t("home.publication.statusWikiBehind"));
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: false,
        wikiSyncStatus: "conflicting",
        loteReview: readyReview,
      }),
    ).toBe(t("home.publication.statusWikiConflict"));
  });

  it("does not echo the draft chip when there is nothing to send", () => {
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.Draft,
        canSendReview: false,
      }),
    ).toBeNull();
  });

  it("asks to send a draft with pending changes", () => {
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.Draft,
        canSendReview: true,
      }),
    ).toBe(t("home.publication.statusUnsent"));
  });

  it("does not treat a missing lote review as ready to publish", () => {
    expect(isPublishReady(undefined)).toBe(true);
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: false,
      }),
    ).toBeNull();
  });

  it("maps review rollup without using isPublishReady", () => {
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: false,
        loteReview: { ...readyReview, approvals: 0 },
      }),
    ).toBe(t("home.publication.statusWaitingApproval"));
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: false,
        loteReview: { ...readyReview, checksOk: false },
      }),
    ).toBe(t("home.publication.statusChecksFail"));
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: false,
        loteReview: { ...readyReview, checksOk: null },
      }),
    ).toBe(t("home.publication.statusChecking"));
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.InReview,
        canSendReview: false,
        loteReview: readyReview,
      }),
    ).toBe(t("home.publication.statusReadyToPublish"));
  });

  it("tints waiting review as warning and ready as success", () => {
    expect(
      publicationStatusTone({
        kind: PublicationKind.InReview,
        canSendReview: false,
        loteReview: { ...readyReview, approvals: 0 },
      }),
    ).toBe(PublicationStatusTone.Warning);
    expect(
      publicationStatusTone({
        kind: PublicationKind.InReview,
        canSendReview: false,
        loteReview: readyReview,
      }),
    ).toBe(PublicationStatusTone.Success);
  });

  it("says the publication is already on the wiki", () => {
    expect(
      publicationStatusLine(t, {
        kind: PublicationKind.Published,
        canSendReview: true,
        wikiSyncStatus: "behind",
        loteReview: readyReview,
      }),
    ).toBe(t("home.publication.statusOnWiki"));
  });
});

describe("publicationChangeCount", () => {
  it("hides zero and omits the count when the line already says unsent", () => {
    expect(
      publicationChangeCount({ drafts: 0, kind: PublicationKind.Draft, canSendReview: true }),
    ).toBe(0);
    expect(
      publicationChangeCount({ drafts: 2, kind: PublicationKind.Draft, canSendReview: true }),
    ).toBe(0);
  });

  it("keeps the count when wiki sync or in-review is the status line", () => {
    expect(
      publicationChangeCount({
        drafts: 2,
        kind: PublicationKind.Draft,
        canSendReview: true,
        wikiSyncStatus: "behind",
      }),
    ).toBe(2);
    expect(
      publicationChangeCount({ drafts: 3, kind: PublicationKind.InReview, canSendReview: true }),
    ).toBe(3);
  });
});

describe("publicationCta", () => {
  const readyReview = {
    prNumber: 1,
    prUrl: "",
    title: "Onboarding",
    branch: "pub/onboarding",
    reviewers: ["ada"],
    checksOk: true as boolean | null,
    approvals: 1,
    state: "open" as const,
  };

  it("sends when there are unsent changes", () => {
    expect(
      publicationCta({
        canSendReview: true,
        canPublishBatch: true,
        loteReview: readyReview,
      }),
    ).toBe(PublicationCta.Send);
  });

  it("publishes when the lote is ready and nothing is blocked", () => {
    expect(
      publicationCta({
        canSendReview: false,
        canPublishBatch: true,
        loteReview: readyReview,
      }),
    ).toBe(PublicationCta.Publish);
  });

  it("hides publish without a lote review even if isPublishReady is true", () => {
    expect(isPublishReady(undefined)).toBe(true);
    expect(publicationCta({ canSendReview: false, canPublishBatch: true })).toBe(PublicationCta.None);
  });

  it("hides the cta while wiki sync is blocked or approval is still pending", () => {
    expect(
      publicationCta({
        canSendReview: false,
        canPublishBatch: true,
        wikiSyncStatus: "conflicting",
        loteReview: readyReview,
      }),
    ).toBe(PublicationCta.None);
    expect(
      publicationCta({
        canSendReview: false,
        canPublishBatch: true,
        loteReview: { ...readyReview, approvals: 0 },
      }),
    ).toBe(PublicationCta.None);
  });

  it("lands a published publication instead of send or publish", () => {
    expect(
      publicationCta({
        kind: PublicationKind.Published,
        canSendReview: true,
        canPublishBatch: true,
        loteReview: readyReview,
      }),
    ).toBe(PublicationCta.Land);
  });
});

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("writes the text and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    await expect(copyToClipboard("pub/onboarding")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("pub/onboarding");
  });

  it("reports failure when the clipboard rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    await expect(copyToClipboard("pub/onboarding")).resolves.toBe(false);
  });
});

describe("isPublishReady", () => {
  it("allows publish when GitHub data is missing", () => {
    expect(isPublishReady(undefined)).toBe(true);
  });

  it("waits for an approval on an open PR", () => {
    expect(
      isPublishReady({
        prNumber: 1,
        prUrl: "",
        title: "Onboarding",
        branch: "pub/onboarding",
        reviewers: [],
        checksOk: true,
        approvals: 0,
        state: "open",
      }),
    ).toBe(false);
    expect(
      isPublishReady({
        prNumber: 1,
        prUrl: "",
        title: "Onboarding",
        branch: "pub/onboarding",
        reviewers: [],
        checksOk: true,
        approvals: 1,
        state: "open",
      }),
    ).toBe(true);
  });
});

describe("publishErrorCopy", () => {
  it("maps host blocker tokens, including Electron wrapping", () => {
    expect(publishBlockerFromError("Error invoking remote method 'publishBatch': Error: needs approval")).toBe(
      PublishBlocker.NeedsApproval,
    );
    expect(publishErrorCopy("needs approval", t)).toBe(t("home.pr.publishNeedsApproval"));
    expect(publishErrorCopy("checks failing", t)).toBe(t("home.pr.publishChecksFailing"));
  });
});

describe("badgeChip", () => {
  it("uses a minus chip for deleted drafts", () => {
    expect(badgeChip("eliminado")).toEqual({ letter: "−", className: "chip-deleted" });
  });
});
