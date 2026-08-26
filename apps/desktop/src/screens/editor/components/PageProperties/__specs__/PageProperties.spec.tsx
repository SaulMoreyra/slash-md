import type { ComponentProps } from "react";
import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent } from "../../../../../test/render";
import { PageProperties } from "../PageProperties";

describe("PageProperties", () => {
  const onFrontmatterPatch = vi.fn(async () => undefined);

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (
    props: Partial<ComponentProps<typeof PageProperties>> = {},
  ) =>
    renderWithProviders(
      <PageProperties
        fields={emptyFrontmatter()}
        canWrite
        onFrontmatterPatch={onFrontmatterPatch}
        {...props}
      />,
    );

  it("hides when empty and read-only", () => {
    const { container } = renderComponent({ canWrite: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows existing people and tags", () => {
    renderComponent({
      fields: { ...emptyFrontmatter(), people: "alice", tags: "api" },
      canWrite: false,
    });
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("editor.properties.addTagAria") })).not.toBeInTheDocument();
  });

  it("adds a tag from the inline composer", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("editor.properties.addTagAria") }));
    await user.type(screen.getByRole("textbox", { name: new RegExp(t("editor.properties.addTagAria")) }), "docs");
    await user.keyboard("{Enter}");
    expect(onFrontmatterPatch).toHaveBeenCalledWith({ tags: "docs" });
  });

  it("adds a person and strips @", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: t("editor.properties.addPersonAria") }));
    await user.type(screen.getByRole("textbox", { name: new RegExp(t("editor.properties.addPersonAria")) }), "@bob");
    await user.keyboard("{Enter}");
    expect(onFrontmatterPatch).toHaveBeenCalledWith({ people: "bob" });
  });

  it("removes a person from the chip", async () => {
    const user = userEvent.setup();
    renderComponent({
      fields: { ...emptyFrontmatter(), people: "alice" },
    });
    await user.click(
      screen.getByRole("button", { name: new RegExp(t("editor.properties.removeAria", { item: "@alice" })) }),
    );
    expect(onFrontmatterPatch).toHaveBeenCalledWith({ people: "" });
  });
});
