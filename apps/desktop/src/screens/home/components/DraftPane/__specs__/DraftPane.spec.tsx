import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import type { RunOp } from "../../../types";
import { mockDraft, mockPayload } from "../../../__fixtures__/home";
import { DraftPane } from "../DraftPane";

describe("DraftPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const onNewPage = vi.fn();
  const onNewPublication = vi.fn();
  const onReview = vi.fn();
  const runOp = vi.fn(async <T,>(_op: string, fn: () => Promise<T>) => fn()) as unknown as RunOp;

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
        runOp={runOp}
        onRefresh={onRefresh}
        onOpenPage={onOpenPage}
        onClosePage={onClosePage}
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

  it("shows send-review icon in the header during publication mode", async () => {
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
        canSendReview: true,
      }),
    });
    expect(screen.getByRole("list", { name: t("home.drafts.title") })).toBeInTheDocument();
    const send = screen.getByRole("button", { name: t("home.publication.sendReview") });
    expect(send).toBeEnabled();
    await user.click(send);
    expect(onReview).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: t("home.drafts.sendCount", { count: 1 }) })).not.toBeInTheDocument();
  });

  it("disables send-review icon when there are no pending changes", () => {
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
    expect(screen.getByRole("button", { name: t("home.publication.sendReview") })).toBeDisabled();
  });

  it("shows an empty local-changes pane in personal mode", () => {
    renderComponent({ personal: true, payload: mockPayload({ drafts: [] }) });
    expect(screen.getByText(t("home.drafts.localChanges"))).toBeInTheDocument();
    expect(screen.getByText(t("home.drafts.emptyTitle"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.drafts.modifiedCount", { count: 5 }))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.drafts.close") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.drafts.publish") })).not.toBeInTheDocument();
  });

  it("publishes deleted local changes from the pane", async () => {
    const user = userEvent.setup();
    const publishPersonal = vi.fn(async () => ({ url: "https://github.com/acme/docs" }));
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { publishPersonal },
    });
    const draft = mockDraft({
      path: "docs/prds/new-template.md",
      title: "new-template.md",
      badge: "eliminado",
    });
    renderComponent({
      personal: true,
      pagePath: draft.path,
      payload: mockPayload({ drafts: [draft] }),
    });

    expect(screen.getByRole("button", { name: t("home.drafts.publish") })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: t("home.drafts.publishCount", { count: 1 }) }));

    expect(publishPersonal).toHaveBeenCalledWith([draft.path]);
    expect(onRefresh).toHaveBeenCalled();
    expect(onClosePage).toHaveBeenCalled();
    expect(screen.getByText(t("home.drafts.published"))).toBeInTheDocument();
  });
});
