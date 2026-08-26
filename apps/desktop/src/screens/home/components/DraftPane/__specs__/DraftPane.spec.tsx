import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import type { Run } from "../../../types";
import { mockDraft, mockPayload } from "../../../__fixtures__/home";
import { DraftPane } from "../DraftPane";

describe("DraftPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const onClose = vi.fn();
  const onNewPage = vi.fn();
  const onNewPublication = vi.fn();
  const onReview = vi.fn();
  const run = vi.fn(async <T,>(fn: () => Promise<T>) => fn()) as unknown as Run;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof DraftPane>> = {}) =>
    renderWithProviders(
      <DraftPane
        payload={mockPayload()}
        personal={false}
        busy={false}
        pagePath={null}
        trails={new Map()}
        run={run}
        onRefresh={onRefresh}
        onOpenPage={onOpenPage}
        onClosePage={onClosePage}
        onClose={onClose}
        onNewPage={onNewPage}
        onNewPublication={onNewPublication}
        onReview={onReview}
        {...props}
      />,
    );

  it("prompts for a publication when workspace has none mounted", async () => {
    const user = userEvent.setup();
    renderComponent();
    expect(screen.getByText(t("home.drafts.emptyNeedsTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.drafts.emptyNeedsPublication"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: new RegExp(t("home.publication.new")) }));
    expect(onNewPublication).toHaveBeenCalled();
  });

  it("renders empty state with new page when publication is mounted", async () => {
    const user = userEvent.setup();
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "My note",
          branch: "pub/2026-08-25-my-note",
          kind: "draft",
        },
        canWrite: true,
      }),
    });
    expect(screen.getByText(t("home.drafts.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.drafts.emptyBody"))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: t("home.nav.newPage") }));
    expect(onNewPage).toHaveBeenCalled();
  });

  it("lists drafts and opens a page", async () => {
    const user = userEvent.setup();
    const draft = mockDraft();
    renderComponent({
      payload: mockPayload({
        drafts: [draft],
        selected: [draft.path],
        publication: {
          title: "My note",
          branch: "pub/2026-08-25-my-note",
          kind: "draft",
        },
        canWrite: true,
      }),
    });
    expect(screen.getByRole("list", { name: t("home.drafts.title") })).toBeInTheDocument();
    await user.click(screen.getAllByText("a.md")[0]!);
    expect(onOpenPage).toHaveBeenCalledWith(draft.path);
  });

  it("lists drafts without a send-review footer in publication mode", () => {
    const draft = mockDraft();
    renderComponent({
      payload: mockPayload({
        drafts: [draft],
        selected: [draft.path],
        publication: {
          title: "My note",
          branch: "pub/2026-08-25-my-note",
          kind: "draft",
        },
        canWrite: true,
        canSendReview: true,
      }),
    });
    expect(screen.getByRole("list", { name: t("home.drafts.title") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
  });

  it("hides send review in the pane when there are no pending changes", () => {
    const draft = mockDraft();
    renderComponent({
      payload: mockPayload({
        drafts: [draft],
        selected: [draft.path],
        publication: {
          title: "My note",
          branch: "pub/2026-08-25-my-note",
          kind: "draft",
        },
        canWrite: true,
        canSendReview: false,
      }),
    });
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
  });
});
