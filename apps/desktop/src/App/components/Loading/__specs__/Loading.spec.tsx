import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../test/render";
import { AppContext } from "../../../context";
import type { AppControllerApi } from "../../../hooks/useAppController";
import { buildMockAppController } from "../../../__specs__/mocks";
import { Loading } from "../Loading";

describe("App.Loading", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderLoading = (overrides: Partial<AppControllerApi> = {}) => {
    const value = buildMockAppController(overrides);
    renderWithProviders(
      <AppContext.Provider value={value}>
        <Loading />
      </AppContext.Provider>,
    );
    return value;
  };

  it("renders brand and loading status", () => {
    renderLoading();
    expect(screen.getByText("Slash MD")).toBeInTheDocument();
    expect(screen.getByText(t("app.loading"))).toBeInTheDocument();
    expect(screen.getByText(t("app.loadingHint"))).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error and retries refresh", async () => {
    const user = userEvent.setup();
    const value = renderLoading({ chrome: { busy: false, error: "boom" } });
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    await user.click(screen.getByRole("button", { name: t("app.retry") }));
    expect(value.run).toHaveBeenCalled();
  });
});
