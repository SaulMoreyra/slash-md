import { t } from "i18next";
import { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitFor } from "../../../../../../../test/render";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../../../test/render";
import type { DesktopApi } from "../../../../../../../../shared/api";
import { Composer } from "../Composer";

function Harness({ initial = "" }: { initial?: string }) {
  const [draft, setDraft] = useState(initial);
  return (
    <Composer
      composer={{
        draft,
        canSend: draft.trim().length > 0,
        onDraftChange: setDraft,
        onSend: vi.fn(),
      }}
      streaming={false}
      onAbort={vi.fn()}
    />
  );
}

describe("Composer", () => {
  beforeEach(() => {
    cleanup();
    window.slashmd = {
      searchIndex: vi.fn(async () => [
        { path: "docs/a.md", title: "Alpha" },
        { path: "docs/alpha-alt.md", title: "Alpha alt" },
        { path: "docs/b.md", title: "Beta" },
      ]),
    } as unknown as DesktopApi;
  });

  it("opens the mention popup and commits the picked page as a token", async () => {
    renderWithProviders(<Harness />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Mirá @a");

    await waitFor(() => expect(screen.getByRole("option", { name: /docs\/a\.md/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("option", { name: /docs\/a\.md/ }));

    expect(input).toHaveValue("Mirá @docs/a.md ");
  });

  it("picks the active match on Enter", async () => {
    renderWithProviders(<Harness />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "@b");

    await waitFor(() => expect(screen.getByRole("option", { name: /Beta/ })).toBeInTheDocument());
    await userEvent.keyboard("{Enter}");

    expect(input).toHaveValue("@docs/b.md ");
  });

  it("closes the popup on Escape while keeping the draft", async () => {
    renderWithProviders(<Harness />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "@b");

    await waitFor(() => expect(screen.getByRole("option", { name: /Beta/ })).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(input).toHaveValue("@b");
  });

  it("does not open the popup for fully typed mentions", async () => {
    renderWithProviders(<Harness initial="@docs/a.md por favor" />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows a chip per mention and removes it", async () => {
    renderWithProviders(<Harness initial="Mirá @docs/a.md por favor" />);
    const input = screen.getByRole("textbox");

    const remove = screen.getByRole("button", { name: t("home.chat.mention.remove", { path: "docs/a.md" }) });
    await userEvent.click(remove);

    expect(input).toHaveValue("Mirá por favor");
  });
});