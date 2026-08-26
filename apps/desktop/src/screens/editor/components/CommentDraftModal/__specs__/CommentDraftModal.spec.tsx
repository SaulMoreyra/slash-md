import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { CommentDraftModal } from "../CommentDraftModal";

describe("CommentDraftModal", () => {
  const onBodyChange = vi.fn();
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("disables submit when body is empty", () => {
    renderWithProviders(
      <CommentDraftModal
        commentDraft="selected text"
        commentBody=""
        onBodyChange={onBodyChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText("selected text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("editor.comment.submit") })).toBeDisabled();
  });

  it("submits when body is present", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CommentDraftModal
        commentDraft="selected text"
        commentBody="Looks good"
        onBodyChange={onBodyChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("button", { name: t("editor.comment.submit") }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
