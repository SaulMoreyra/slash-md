import { describe, it, expect, vi, beforeEach } from "vitest";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, userEvent, waitFor, within } from "../../../../../test/render";
import type { DesktopApi } from "../../../../../../shared/api";
import { AgentsModal } from "../AgentsModal";

const opencode = {
  name: "opencode",
  label: "opencode",
  command: "opencode",
  available: true,
  loginCommand: "opencode providers login",
  loginPasteKey: true,
  loginProviders: [
    { id: "opencode", label: "OpenCode Zen" },
    { id: "nvidia", label: "NVIDIA (Build)" },
  ],
};
const cursor = { name: "cursor", label: "Cursor", command: "cursor", available: true, loginCommand: "cursor auth login" };
const claude = { name: "claude", label: "Claude Code", command: "claude", available: false };

function makeApi() {
  const subscribers: Array<(update: unknown) => void> = [];
  const list = [opencode, cursor, claude];
  const chatListAgents = vi.fn(async () => list);
  const agentProbeStatus = vi.fn(async (name: string) => {
    const info = list.find((candidate) => candidate.name === name);
    return info
      ? { name, available: info.available, loggedIn: false }
      : { name, available: false, loggedIn: null };
  });
  const agentLogin = vi.fn(async () => undefined);
  const agentLoginAbort = vi.fn(async () => undefined);
  const agentSetApiKey = vi.fn(async (name: string) => ({
    name,
    available: true,
    loggedIn: true,
  }));
  const openUrl = vi.fn(async () => undefined);
  const onAgentLoginUpdate = vi.fn((handler: (update: unknown) => void) => {
    subscribers.push(handler);
    return () => {
      const index = subscribers.indexOf(handler);
      if (index >= 0) {
        subscribers.splice(index, 1);
      }
    };
  });
  const api = {
    chatListAgents,
    agentProbeStatus,
    agentLogin,
    agentLoginAbort,
    agentSetApiKey,
    openUrl,
    onAgentLoginUpdate,
  } as unknown as DesktopApi & { __emit: (update: unknown) => void };
  api.__emit = (update) => subscribers.forEach((handler) => handler(update));
  return { api, agentProbeStatus, agentLogin, agentLoginAbort, agentSetApiKey };
}

describe("AgentsModal", () => {
  const onClose = vi.fn();
  let api!: ReturnType<typeof makeApi>["api"];
  let agentProbeStatus!: ReturnType<typeof makeApi>["agentProbeStatus"];
  let agentLogin!: ReturnType<typeof makeApi>["agentLogin"];
  let agentLoginAbort!: ReturnType<typeof makeApi>["agentLoginAbort"];
  let agentSetApiKey!: ReturnType<typeof makeApi>["agentSetApiKey"];

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    const made = makeApi();
    api = made.api;
    agentProbeStatus = made.agentProbeStatus;
    agentLogin = made.agentLogin;
    agentLoginAbort = made.agentLoginAbort;
    agentSetApiKey = made.agentSetApiKey;
    window.slashmd = api;
  });

  const renderComponent = () => renderWithProviders(<AgentsModal onClose={onClose} />);
  const rowOf = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

  it("lists available and missing agents with their state", async () => {
    renderComponent();
    expect(await screen.findByText("opencode")).toBeInTheDocument();
    expect(screen.getByText("Cursor")).toBeInTheDocument();
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(agentProbeStatus).toHaveBeenCalledWith("opencode");
  });

  it("opens the paste-API-key form for opencode instead of the background login", async () => {
    renderComponent();
    await screen.findByText("opencode");
    await userEvent.click(within(rowOf("opencode")).getByRole("button", { name: t("home.modals.agents.login") }));

    expect(agentLogin).not.toHaveBeenCalled();
    expect(screen.getByText(t("home.modals.agents.pasteKeyTitle"))).toBeInTheDocument();
  });

  it("saves the pasted key and updates the row state", async () => {
    renderComponent();
    await screen.findByText("opencode");
    await userEvent.click(within(rowOf("opencode")).getByRole("button", { name: t("home.modals.agents.login") }));
    await userEvent.type(screen.getByLabelText(t("home.modals.agents.pasteKeyKey")), "sk-1234567890");
    await userEvent.click(screen.getByRole("button", { name: t("home.modals.agents.pasteKeySubmit") }));

    await waitFor(() => expect(agentSetApiKey).toHaveBeenCalledWith("opencode", "opencode", "sk-1234567890"));
    await waitFor(() => expect(screen.queryByText(t("home.modals.agents.pasteKeyTitle"))).not.toBeInTheDocument());
    await waitFor(() =>
      expect(within(rowOf("opencode")).getByRole("button", { name: t("home.modals.agents.recheckAgent") })).toBeInTheDocument(),
    );
  });

  it("keeps the form open and shows the error when saving fails", async () => {
    agentSetApiKey.mockRejectedValueOnce(new Error("no se pudo guardar"));
    renderComponent();
    await screen.findByText("opencode");
    await userEvent.click(within(rowOf("opencode")).getByRole("button", { name: t("home.modals.agents.login") }));
    await userEvent.type(screen.getByLabelText(t("home.modals.agents.pasteKeyKey")), "sk-1234567890");
    await userEvent.click(screen.getByRole("button", { name: t("home.modals.agents.pasteKeySubmit") }));

    expect(await screen.findByText("no se pudo guardar")).toBeInTheDocument();
    expect(screen.getByText(t("home.modals.agents.pasteKeyTitle"))).toBeInTheDocument();
  });

  it("starts the background login flow for agents without key-paste", async () => {
    renderComponent();
    await screen.findByText("Cursor");
    await userEvent.click(within(rowOf("Cursor")).getByRole("button", { name: t("home.modals.agents.login") }));
    await waitFor(() => expect(agentLogin).toHaveBeenCalledWith("cursor"));
  });

  it("presents the browser URL and rechecks status on success", async () => {
    renderComponent();
    await screen.findByText("Cursor");
    await userEvent.click(within(rowOf("Cursor")).getByRole("button", { name: t("home.modals.agents.login") }));
    await waitFor(() => expect(agentLogin).toHaveBeenCalled());

    api.__emit({ agent: "cursor", type: "line", text: "sign in here: https://auth.example/xyz\n" });
    api.__emit({ agent: "cursor", type: "url", url: "https://auth.example/xyz" });
    expect(await screen.findByRole("button", { name: t("home.modals.agents.openBrowser") })).toBeInTheDocument();

    const probesBefore = agentProbeStatus.mock.calls.length;
    api.__emit({ agent: "cursor", type: "done", ok: true });
    await waitFor(() => expect(agentProbeStatus.mock.calls.length).toBeGreaterThan(probesBefore));
  });

  it("shows the copy-command fallback when login fails", async () => {
    renderComponent();
    await screen.findByText("Cursor");
    await userEvent.click(within(rowOf("Cursor")).getByRole("button", { name: t("home.modals.agents.login") }));
    await waitFor(() => expect(agentLogin).toHaveBeenCalled());

    api.__emit({ agent: "cursor", type: "error", message: "boom" });
    expect(await screen.findByText(t("home.modals.agents.loginFailed"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("home.modals.agents.copyCommand") })).toBeInTheDocument();
  });

  it("blocks dismissal while a login is running", async () => {
    renderComponent();
    await screen.findByText("Cursor");
    await userEvent.click(within(rowOf("Cursor")).getByRole("button", { name: t("home.modals.agents.login") }));
    await waitFor(() => expect(agentLogin).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: t("common.close") })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: t("common.cancel") }));
    expect(agentLoginAbort).toHaveBeenCalledWith("cursor");
    expect(onClose).not.toHaveBeenCalled();
  });
});