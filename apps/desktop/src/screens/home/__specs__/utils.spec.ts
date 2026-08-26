import { describe, it, expect } from "vitest";
import { t } from "i18next";
import { mockPayload } from "../__fixtures__/home";
import { CreateIntent, PublicationKind, PrCheckStatus, PublishBlocker } from "../enums";
import {
  createIntentForSection,
  findFolderCover,
  isPublishReady,
  loteReviewFromPayload,
  prCheckStatus,
  publicationKindLabel,
  publicationRowsForList,
  publishBlockerFromError,
  publishErrorCopy,
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

describe("findFolderCover", () => {
  it("prefers README.md over index.md", () => {
    const cover = findFolderCover({
      kind: "folder",
      path: "docs",
      title: "docs",
      children: [
        { kind: "file", path: "docs/index.md", title: "Index" },
        { kind: "file", path: "docs/README.md", title: "Docs" },
      ],
    });
    expect(cover?.path).toBe("docs/README.md");
  });

  it("falls back to index.md", () => {
    const cover = findFolderCover({
      kind: "folder",
      path: "docs",
      title: "docs",
      children: [{ kind: "file", path: "docs/index.md", title: "Index" }],
    });
    expect(cover?.path).toBe("docs/index.md");
  });

  it("matches cover names case-insensitively", () => {
    const cover = findFolderCover({
      kind: "folder",
      path: "docs",
      title: "docs",
      children: [{ kind: "file", path: "docs/Readme.md", title: "Docs" }],
    });
    expect(cover?.path).toBe("docs/Readme.md");
  });

  it("ignores nested covers and other files", () => {
    const cover = findFolderCover({
      kind: "folder",
      path: "docs",
      title: "docs",
      children: [
        {
          kind: "folder",
          path: "docs/prds",
          title: "prds",
          children: [{ kind: "file", path: "docs/prds/README.md", title: "PRDs" }],
        },
        { kind: "file", path: "docs/guide.md", title: "Guide" },
      ],
    });
    expect(cover).toBeUndefined();
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
});

describe("prCheckStatus", () => {
  it("maps check rollup to an enum", () => {
    expect(prCheckStatus(true)).toBe(PrCheckStatus.Ok);
    expect(prCheckStatus(false)).toBe(PrCheckStatus.Failing);
    expect(prCheckStatus(null)).toBe(PrCheckStatus.Pending);
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
