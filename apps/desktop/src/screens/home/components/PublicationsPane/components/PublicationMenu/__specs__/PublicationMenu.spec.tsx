import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../../test/render";
import { PublicationMenu, type PublicationMenuProps } from "../PublicationMenu";

describe("PublicationMenu", () => {
  const onLeave = vi.fn();
  const onOpenGithub = vi.fn();
  const onCopyBranch = vi.fn();
  const onDiscard = vi.fn();

  const defaultProps = {
    title: "Onboarding Q3",
    branch: "pub/onboarding",
    busy: false,
    onLeave,
    onCopyBranch,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<PublicationMenuProps> = {}) =>
    renderWithProviders(<PublicationMenu {...defaultProps} {...props} />);

  it("lists wiki, github, and copy when a review url exists", async () => {
    const user = userEvent.setup();
    renderComponent({ prUrl: "https://example.com/pull/12", onOpenGithub });
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    expect(screen.getByRole("menuitem", { name: t("home.publication.leave") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("home.publication.viewOnGithub") })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("home.publication.copyBranch") })).toBeInTheDocument();
  });

  it("hides github when there is no review url", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    expect(screen.queryByRole("menuitem", { name: t("home.publication.viewOnGithub") })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("home.publication.leave") })).toBeInTheDocument();
  });

  it("calls leave from the overflow menu", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.leave") }));
    expect(onLeave).toHaveBeenCalled();
  });

  it("puts discard last as a danger action", async () => {
    const user = userEvent.setup();
    renderComponent({ onDiscard });
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    const items = screen.getAllByRole("menuitem");
    expect(items.at(-1)).toHaveTextContent(t("home.publication.discard"));
    await user.click(screen.getByRole("menuitem", { name: t("home.publication.discard") }));
    expect(onDiscard).toHaveBeenCalled();
  });

  it("can show discard alone for other publications", async () => {
    const user = userEvent.setup();
    renderComponent({ onLeave: undefined, onCopyBranch: undefined, onDiscard });
    await user.click(screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }));
    expect(screen.queryByRole("menuitem", { name: t("home.publication.leave") })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: t("home.publication.discard") })).toBeInTheDocument();
  });

  it("disables the trigger while busy", () => {
    renderComponent({ busy: true });
    expect(
      screen.getByRole("button", { name: t("home.publication.menuAria", { title: "Onboarding Q3" }) }),
    ).toBeDisabled();
  });
});
