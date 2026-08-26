import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../test/render";
import { PublicationKind } from "../../../../enums";
import { PublicationRow } from "../PublicationRow";

describe("PublicationRow", () => {
  const onResume = vi.fn();

  const defaultPub: PublicationSummary = {
    title: "Pagina nueva",
    branch: "pub/2026-08-25-pagina-nueva",
    kind: PublicationKind.InReview,
    mounted: false,
  };

  const defaultProps = {
    pub: defaultPub,
    busy: false,
    onResume,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
    renderWithProviders(<PublicationRow {...defaultProps} {...props} />);

  it("shows status without git branch names", () => {
    renderComponent();
    expect(screen.getByText("Pagina nueva")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.kindInReview"))).toBeInTheDocument();
    expect(screen.queryByText("pub/2026-08-25-pagina-nueva")).not.toBeInTheDocument();
  });

  it("resumes an unmounted publication", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(
      screen.getByRole("button", { name: `${t("home.publication.resume")}: Pagina nueva` }),
    );
    expect(onResume).toHaveBeenCalledWith("pub/2026-08-25-pagina-nueva");
  });
});
