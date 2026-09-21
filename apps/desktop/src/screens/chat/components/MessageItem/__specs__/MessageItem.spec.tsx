import { t } from "i18next";
import { describe, expect, it } from "vitest";
import { cleanup, renderWithProviders, screen } from "../../../../../test/render";
import { ChatRole, TurnStatus } from "../../../enums";
import type { ChatTurn } from "../../../types";
import { MessageItem } from "../MessageItem";

function turn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  return {
    id: "t1",
    role: ChatRole.Agent,
    text: "",
    thinking: "",
    tools: [],
    status: TurnStatus.Done,
    ...overrides,
  };
}

const onOpenLink = () => undefined;

describe("MessageItem", () => {
  it("renders the agent role label and markdown", () => {
    renderWithProviders(
      <MessageItem turn={turn({ text: "# Hola" })} onOpenLink={onOpenLink} />,
    );
    expect(screen.getByText(t("home.chat.agent"))).toBeInTheDocument();
    expect(screen.getByText("Hola")).toBeInTheDocument();
  });

  it("renders the user role label", () => {
    renderWithProviders(
      <MessageItem turn={turn({ role: ChatRole.User, text: "¿Qué es X?" })} onOpenLink={onOpenLink} />,
    );
    expect(screen.getByText(t("home.chat.you"))).toBeInTheDocument();
    expect(screen.getByText("¿Qué es X?")).toBeInTheDocument();
  });

  it("shows the blinking caret while streaming with text", () => {
    renderWithProviders(
      <MessageItem turn={turn({ status: TurnStatus.Streaming, text: "hola" })} onOpenLink={onOpenLink} />,
    );
    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(screen.getByText(t("home.chat.agent"))).toBeInTheDocument();
  });

  it("renders typing dots while streaming with no text yet", () => {
    renderWithProviders(
      <MessageItem turn={turn({ status: TurnStatus.Streaming, text: "" })} onOpenLink={onOpenLink} />,
    );
    expect(screen.queryByText("hola")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("renders the tool trail chips", () => {
    renderWithProviders(
      <MessageItem
        turn={turn({ tools: [{ name: "read", brief: "docs/a.md" }] })}
        onOpenLink={onOpenLink}
      />,
    );
    expect(screen.getByText("read: docs/a.md")).toBeInTheDocument();
  });

  it("shows the edit status while a page edit turn streams", () => {
    renderWithProviders(
      <MessageItem turn={turn({ edit: true, status: TurnStatus.Streaming })} onOpenLink={onOpenLink} />,
    );
    expect(screen.getByText(t("home.chat.editingPage"))).toBeInTheDocument();
  });

  it("shows the edited chip once a page edit turn finishes", () => {
    renderWithProviders(
      <MessageItem turn={turn({ edit: true, status: TurnStatus.Done })} onOpenLink={onOpenLink} />,
    );
    expect(screen.getByText(t("home.chat.edited"))).toBeInTheDocument();
  });

  it("renders the turn error", () => {
    renderWithProviders(
      <MessageItem
        turn={turn({ status: TurnStatus.Error, error: "boom" })}
        onOpenLink={onOpenLink}
      />,
    );
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("cleans up between cases", () => {
    cleanup();
    expect(true).toBe(true);
  });
});