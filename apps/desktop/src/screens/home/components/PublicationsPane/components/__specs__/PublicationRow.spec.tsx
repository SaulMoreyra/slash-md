import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../test/render";
import { PublicationKind } from "../../../../enums";
import { PublicationRow } from "../PublicationRow";

describe("PublicationRow", () => {
  const onResume = vi.fn();
  const onLand = vi.fn();
  const onDiscard = vi.fn();

  const defaultPub: PublicationSummary = {
    title: "Pagina nueva",
    branch: "pub/2026-08-25-pagina-nueva",
    kind: PublicationKind.InReview,
    mounted: false,
    approved: false,
    commenters: [{ login: "ada", avatarUrl: "https://example.com/ada.png" }],
  };

  const defaultProps = {
    pub: defaultPub,
    busy: false,
    onResume,
    onLand,
    onDiscard,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<PublicationRow {...defaultProps} {...props} />);

  it("shows the git branch, approval, and commenter on in-review rows", () => {
    renderComponent();
    expect(screen.getByText("Pagina nueva")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.kindInReview"))).toBeInTheDocument();
    expect(screen.getByText("pub/2026-08-25-pagina-nueva")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.rowAwaitingApproval"))).toBeInTheDocument();
    expect(screen.getByLabelText(t("home.publication.commentersAria", { names: "@ada" }))).toBeInTheDocument();
  });

  it("shows approved copy when the pull is approved", () => {
    renderComponent({ pub: { ...defaultPub, approved: true } });
    expect(screen.getByText(t("home.publication.rowApproved"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.rowAwaitingApproval"))).not.toBeInTheDocument();
  });

  it("shows file and line stats on draft rows", () => {
    renderComponent({
      pub: {
        title: "Wiki ahead",
        branch: "pub/wiki-ahead",
        kind: PublicationKind.Draft,
        mounted: false,
        changedFiles: 3,
        additions: 12,
        deletions: 4,
      },
    });
    expect(screen.getByText(t("home.publication.filesChanged", { count: 3 }))).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByText("-4")).toBeInTheDocument();
    expect(screen.queryByText("pub/wiki-ahead")).not.toBeInTheDocument();
  });

  it("resumes an unmounted publication", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole("button", { name: `${t("home.publication.resume")}: Pagina nueva` }),
    );
    expect(onResume).toHaveBeenCalledWith("pub/2026-08-25-pagina-nueva");
  });

  it("lands a published publication instead of resuming", async () => {
    const user = userEvent.setup();
    renderComponent({
      pub: { ...defaultPub, kind: PublicationKind.Published },
    });
    expect(screen.getByText(t("home.publication.kindPublished"))).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: t("home.publication.menuAria", { title: "Pagina nueva" }) }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: `${t("home.publication.landWiki")}: Pagina nueva` }),
    );
    expect(onLand).toHaveBeenCalledWith("pub/2026-08-25-pagina-nueva");
    expect(onResume).not.toHaveBeenCalled();
  });

  it("disables while an operation is running", () => {
    renderComponent({ busy: true });
    expect(
      screen.getByRole("button", { name: `${t("home.publication.resume")}: Pagina nueva` }),
    ).toBeDisabled();
  });

  it("does not resume when discard is opened from the row menu", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Pagina nueva" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.discard") }));
    expect(onDiscard).toHaveBeenCalledWith(defaultPub);
    expect(onResume).not.toHaveBeenCalled();
  });
});
