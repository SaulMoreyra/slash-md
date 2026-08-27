import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { ProcessGuide } from "../ProcessGuide";

describe("ProcessGuide", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders four steps in compact mode without header or CTA", () => {
    renderWithProviders(<ProcessGuide variant="compact" activeStep={2} />);
    expect(screen.queryByText(t("home.process.title"))).not.toBeInTheDocument();
    expect(screen.getByText(t("home.process.wikiTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.draftTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.reviewTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.publishTitle"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("home.publication.new") })).not.toBeInTheDocument();
  });

  it("renders full mode with title, lede, and CTA", () => {
    const onNewPublication = vi.fn();
    renderWithProviders(<ProcessGuide onNewPublication={onNewPublication} />);
    expect(screen.getByText(t("home.process.title"))).toBeInTheDocument();
    expect(screen.getByText(t("home.process.lede"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.publication.new") })).toBeInTheDocument();
  });
});
