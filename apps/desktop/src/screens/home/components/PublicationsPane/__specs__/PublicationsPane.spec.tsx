import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { mockPayload } from "../../../__fixtures__/home";
import type { Run } from "../../../types";
import { PublicationsPane } from "../PublicationsPane";

describe("PublicationsPane", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onNewPublication = vi.fn();
  const run = vi.fn(async <T,>(fn: () => Promise<T>) => fn()) as unknown as Run;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<Omit<ComponentProps<typeof PublicationsPane>, "onNewPublication" | "run" | "onRefresh">> = {}) =>
    renderWithProviders(
      <PublicationsPane
        payload={mockPayload()}
        busy={false}
        run={run}
        onRefresh={onRefresh}
        onNewPublication={onNewPublication}
        {...props}
      />,
    );

  it("renders empty copy and creates a publication", async () => {
    const user = userEvent.setup();
    renderComponent();
    expect(screen.getByText(t("home.publication.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.emptyBody"))).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: t("home.publication.new") }).at(-1)!);
    expect(onNewPublication).toHaveBeenCalled();
  });

  it("lists other publications under the current card", () => {
    renderComponent({
      payload: mockPayload({
        publication: {
          title: "Onboarding Q3",
          branch: "pub/2026-08-25-onboarding-q3",
          kind: "draft",
        },
        publications: [
          {
            title: "Onboarding Q3",
            branch: "pub/2026-08-25-onboarding-q3",
            kind: "draft",
            mounted: true,
          },
          {
            title: "API notes",
            branch: "pub/2026-08-20-api-notes",
            kind: "in_review",
            mounted: false,
          },
        ],
      }),
    });
    expect(screen.getByText("Onboarding Q3")).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.current"))).toBeInTheDocument();
    expect(screen.getByText(t("home.publication.others"))).toBeInTheDocument();
    expect(screen.getByText("API notes")).toBeInTheDocument();
    expect(screen.queryByText("pub/2026-08-25-onboarding-q3")).not.toBeInTheDocument();
    expect(screen.queryByText("pub/2026-08-20-api-notes")).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.mountedBanner", { title: "Onboarding Q3" }))).not.toBeInTheDocument();
    expect(screen.queryByText(t("home.publication.emptyTitle"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.sendReview") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.publish") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.leave") })).not.toBeInTheDocument();
  });
});
