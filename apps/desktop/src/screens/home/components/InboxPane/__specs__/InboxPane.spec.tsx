import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { mockPayload } from "../../../__fixtures__/home";
import { InboxPane } from "../InboxPane";

describe("InboxPane", () => {
  const onOpenPage = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty copy", () => {
    renderWithProviders(<InboxPane payload={mockPayload()} onOpenPage={onOpenPage} />);
    expect(screen.getByText(t("home.inbox.emptyTitle"))).toBeInTheDocument();
    expect(screen.getByText(t("home.inbox.emptyBody"))).toBeInTheDocument();
  });

  it("lists inbox items", () => {
    renderWithProviders(
      <InboxPane
        payload={mockPayload({
          inbox: [
            {
              prNumber: 12,
              prUrl: "https://example.com",
              path: "docs/a.md",
              threadId: "t1",
              excerpt: "Please fix",
              author: "alice",
              createdAt: new Date().toISOString(),
            },
          ],
        })}
        onOpenPage={onOpenPage}
      />,
    );
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Please fix")).toBeInTheDocument();
  });
});
