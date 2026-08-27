import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../test/render";
import { shortcutLabel } from "../../../../../../components/ShortcutKbd";
import { NavKind } from "../../../../enums";
import { RailCollapsedNav } from "../RailCollapsedNav";

describe("RailCollapsedNav", () => {
  const onNav = vi.fn();

  const defaultProps = {
    nav: { kind: NavKind.Drafts } as const,
    isWorkspace: true,
    inboxCount: 0,
    onNav,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<RailCollapsedNav {...defaultProps} {...props} />);

  it("exposes workspace nav actions", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: `${t("home.nav.inbox")} (${shortcutLabel.inbox()})` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${t("home.nav.drafts")} (${shortcutLabel.drafts()})` })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `${t("home.nav.inReview")} (${shortcutLabel.reviews()})` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${t("home.publication.listTitle")} (${shortcutLabel.publications()})` }),
    ).toBeInTheDocument();
  });

  it("hides workspace-only nav outside workspace mode", () => {
    renderComponent({ isWorkspace: false });
    expect(screen.queryByRole("button", { name: `${t("home.nav.inbox")} (${shortcutLabel.inbox()})` })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${t("home.nav.drafts")} (${shortcutLabel.drafts()})` })).toBeInTheDocument();
  });

  it("calls onNav for drafts", async () => {
    const user = userEvent.setup();
    renderComponent();
    const drafts = screen.getByRole("button", { name: `${t("home.nav.drafts")} (${shortcutLabel.drafts()})` });
    await user.click(drafts);
    await user.click(drafts);
    expect(onNav).toHaveBeenCalledTimes(2);
    expect(onNav).toHaveBeenCalledWith({ kind: NavKind.Drafts });
  });
});
