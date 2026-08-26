import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import type { ReviewThread } from "../../../../shared/api";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../test/render";
import { ThreadPopover, type ThreadPopoverProps } from "../ThreadPopover";

const thread: ReviewThread = {
  id: "t1",
  isResolved: false,
  path: "docs/a.md",
  line: 1,
  startLine: null,
  diffSide: "RIGHT",
  snippet: "selected text",
  url: "https://github.com/example",
  comments: [
    {
      id: "c1",
      databaseId: 1,
      author: "alice",
      body: "Looks good",
      avatarUrl: null,
      url: "https://github.com/c1",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "c2",
      databaseId: 2,
      author: "bob",
      body: "Please fix",
      avatarUrl: null,
      url: "https://github.com/c2",
      createdAt: "2024-01-02T00:00:00Z",
    },
  ],
};

describe("ThreadPopover", () => {
  const onClose = vi.fn();
  const onReply = vi.fn(async () => undefined);
  const onResolve = vi.fn(async () => undefined);
  const onOpenGithub = vi.fn();

  const defaultProps: ThreadPopoverProps = {
    thread,
    canWrite: true,
    onClose,
    onReply,
    onResolve,
    onOpenGithub,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ThreadPopoverProps> = {}) =>
    renderWithProviders(<ThreadPopover {...defaultProps} {...props} />);

  it("renders comments and snippet", () => {
    renderComponent();
    expect(screen.getByText("selected text")).toBeInTheDocument();
    expect(screen.getByText("Looks good")).toBeInTheDocument();
    expect(screen.getByText("Please fix")).toBeInTheDocument();
  });

  it("submits a reply and clears the field", async () => {
    const user = userEvent.setup();
    renderComponent();
    const input = screen.getAllByPlaceholderText(t("thread.replyPlaceholder"))[0]!;
    await user.type(input, "My reply");
    await user.click(screen.getByRole("button", { name: t("thread.reply") }));
    expect(onReply).toHaveBeenCalledWith("My reply");
  });

  it("hides reply controls when canWrite is false", () => {
    renderComponent({ canWrite: false });
    expect(screen.queryByPlaceholderText(t("thread.replyPlaceholder"))).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("thread.openGithub") })).toBeInTheDocument();
  });
});
