import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { Empty } from "../Empty";

describe("Empty", () => {
  const onClick = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders copy and fires action", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Empty title="Connect" body="Init workspace" action="Initialize" onClick={onClick} />,
    );
    expect(screen.getByText("Connect")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Initialize" }));
    expect(onClick).toHaveBeenCalled();
  });
});
