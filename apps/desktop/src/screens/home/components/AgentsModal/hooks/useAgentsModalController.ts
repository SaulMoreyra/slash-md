import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentInfo,
  AgentLoginEnvelope,
  AgentLoginStatus,
} from "@slash-md/agents/types";
import { copyToClipboard } from "../../../utils";

const api = () => window.slashmd;

export type AgentRow = {
  info: AgentInfo;
  status: AgentLoginStatus | null;
  probing: boolean;
};

export type AgentLoginView = {
  agent: string;
  lines: string[];
  url: string | null;
  running: boolean;
  done: boolean;
  ok: boolean | null;
  error: string | null;
  copied: boolean;
};

export type AgentKeyForm = {
  agent: string;
  provider: string;
  key: string;
  busy: boolean;
  error: string | null;
};

type Params = {
  onClose: () => void;
};

export function useAgentsModalController({ onClose }: Params) {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [login, setLogin] = useState<AgentLoginView | null>(null);
  const [keyForm, setKeyForm] = useState<AgentKeyForm | null>(null);
  const loginRef = useRef<AgentLoginView | null>(null);

  const applyStatus = useCallback((name: string, status: AgentLoginStatus) => {
    setRows((prev) => prev.map((row) => (row.info.name === name ? { ...row, status, probing: false } : row)));
  }, []);

  const readRows = useCallback(async () => {
    try {
      const items = await api().chatListAgents();
      setRows(items.map((info) => ({ info, status: null, probing: true })));
      for (const info of items) {
        const status = await api().agentProbeStatus(info.name);
        applyStatus(info.name, status);
      }
    } catch {
      setRefreshing(false);
    }
  }, [applyStatus]);

  const onOpenUrl = useCallback((href: string) => {
    void api().openUrl(href);
  }, []);

  const onRecheckAgent = useCallback((agent: string) => {
    setRows((prev) => prev.map((row) => (row.info.name === agent ? { ...row, probing: true } : row)));
    void api()
      .agentProbeStatus(agent)
      .then((status) => applyStatus(agent, status))
      .catch(() => applyStatus(agent, { name: agent, available: false, loggedIn: null }));
  }, [applyStatus]);

  useEffect(() => {
    let alive = true;
    void readRows().finally(() => alive && setRefreshing(false));
    const unsubscribe = api().onAgentLoginUpdate((update: AgentLoginEnvelope) => {
      if (update.type === "done" && update.ok) {
        onRecheckAgent(update.agent);
      }
      setLogin((current) => {
        if (!current || current.agent !== update.agent) {
          return current;
        }
        const next = { ...current, lines: current.lines };
        if (update.type === "line") {
          next.lines = [...current.lines, update.text];
        } else if (update.type === "url") {
          next.url = update.url;
        } else if (update.type === "done") {
          next.running = false;
          next.done = true;
          next.ok = update.ok;
        } else if (update.type === "error") {
          next.running = false;
          next.done = true;
          next.ok = false;
          next.error = update.message;
          if (!next.lines.length) {
            next.lines = [update.message];
          }
        }
        loginRef.current = next;
        return next;
      });
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [readRows, onRecheckAgent]);

  useEffect(() => {
    return () => {
      const active = loginRef.current;
      if (active?.running) {
        void api().agentLoginAbort(active.agent);
      }
    };
  }, []);

  const patchLogin = useCallback((patch: (current: AgentLoginView) => AgentLoginView) => {
    setLogin((current) => {
      if (!current) {
        return current;
      }
      const next = patch(current);
      loginRef.current = next;
      return next;
    });
  }, []);

  /** Manual sign-in command fallback when the headless flow cannot run. */
  const onCopyCommand = useCallback(
    async (agent: string) => {
      const row = rows.find((candidate) => candidate.info.name === agent);
      const command = row?.info.loginCommand;
      if (!command) {
        return;
      }
      const ok = await copyToClipboard(command);
      if (ok) {
        patchLogin((current) =>
          current?.agent === agent ? { ...current, copied: true, error: null } : current,
        );
      }
    },
    [rows, patchLogin],
  );

  const onStartLogin = useCallback(
    async (agent: string) => {
      const row = rows.find((candidate) => candidate.info.name === agent);
      if (row?.info.loginPasteKey && row.info.loginProviders?.length) {
        setKeyForm({
          agent,
          provider: row.info.loginProviders[0].id,
          key: "",
          busy: false,
          error: null,
        });
        return;
      }
      const next = {
        agent,
        lines: [],
        url: null,
        running: true,
        done: false,
        ok: null,
        error: null,
        copied: false,
      };
      loginRef.current = next;
      setLogin(next);
      try {
        await api().agentLogin(agent);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        patchLogin((current) =>
          current?.agent === agent
            ? {
                ...current,
                lines: current.lines.length ? current.lines : [message],
                running: false,
                done: true,
                ok: false,
                error: message,
              }
            : current,
        );
      }
    },
    [rows, patchLogin],
  );

  const onProviderChange = useCallback((provider: string) => {
    setKeyForm((current) => (current ? { ...current, provider, error: null } : current));
  }, []);

  const onKeyChange = useCallback((key: string) => {
    setKeyForm((current) => (current ? { ...current, key, error: null } : current));
  }, []);

  const onCancelKey = useCallback(() => {
    setKeyForm(null);
  }, []);

  const onSubmitKey = useCallback(async () => {
    const form = keyForm;
    if (!form || form.busy || !form.key.trim()) {
      return;
    }
    setKeyForm({ ...form, busy: true, error: null });
    try {
      const status = await api().agentSetApiKey(form.agent, form.provider, form.key);
      applyStatus(form.agent, status);
      setKeyForm(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setKeyForm((current) =>
        current?.agent === form.agent ? { ...current, busy: false, error: message } : current,
      );
    }
  }, [keyForm, applyStatus]);

  const onAbortLogin = useCallback(() => {
    const active = loginRef.current;
    if (!active?.running) {
      return;
    }
    void api().agentLoginAbort(active.agent);
    patchLogin((current) => (current ? { ...current, running: false } : current));
  }, [patchLogin]);

  const onRefreshAll = useCallback(() => {
    setRefreshing(true);
    void readRows().finally(() => setRefreshing(false));
  }, [readRows]);

  const onDismissLogin = useCallback(() => {
    setLogin(null);
    loginRef.current = null;
  }, []);

  const onCloseModal = useCallback(() => {
    const active = loginRef.current;
    if (active?.running) {
      void api().agentLoginAbort(active.agent);
    }
    setKeyForm(null);
    onDismissLogin();
    onClose();
  }, [onClose, onDismissLogin]);

  return {
    rows,
    refreshing,
    login,
    keyForm,
    onStartLogin,
    onAbortLogin,
    onOpenUrl,
    onRecheckAgent,
    onRefreshAll,
    onCopyCommand,
    onDismissLogin,
    onProviderChange,
    onKeyChange,
    onSubmitKey,
    onCancelKey,
    onClose: onCloseModal,
  };
}

export type AgentsModalController = ReturnType<typeof useAgentsModalController>;