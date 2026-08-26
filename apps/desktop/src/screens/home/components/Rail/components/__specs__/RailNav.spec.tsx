import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../../test/render";
import { mockPayload } from "../../../../__fixtures__/home";
import { NavKind } from "../../../../enums";
import { RailNav } from "../RailNav";

describe("RailNav", () => {
  const onNav = vi.fn();

  const defaultProps = {
    nav: { kind: NavKind.Drafts } as const,
    payload: mockPayload(),
    isWorkspace: true,
    onNav,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<RailNav {...defaultProps} {...props} />);

  it("shows inbox and publications in workspace mode", () => {
    renderComponent({ isWorkspace: true });
    expect(screen.getByText(t("home.nav.inbox"))).toBeInTheDocument();
    expect(screen.getByText(t("home.nav.drafts"))).toBeInTheDocument();
    expect(screen.queryByText(t("home.nav.inReview"))).not.toBeInTheDocument();
    expect(screen.getByText(t("home.publication.listTitle"))).toBeInTheDocument();
  });

  it("hides inbox and publications outside workspace mode", () => {
    renderComponent({ isWorkspace: false });
    expect(screen.queryByText(t("home.nav.inbox"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.nav.inReview"))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.listTitle"))).not.toBeInTheDocument();
    expect(screen.getByText(t("home.nav.drafts"))).toBeInTheDocument();
  });
});
