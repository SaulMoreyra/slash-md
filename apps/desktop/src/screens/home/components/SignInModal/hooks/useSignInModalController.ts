import { useCallback, useEffect, useState } from "react";
import type { GhCliProbe } from "../../../../../../shared/api";
import { copyToClipboard } from "../../../utils";
import { GH_AUTH_LOGIN_COMMAND, GITHUB_PAT_CREATE_URL, GhCliStatus } from "../../../enums";

const api = () => window.slashmd;

type Params = {
  busy: boolean;
  onSave: (token?: string) => void;
};

function statusFromProbe(probe: GhCliProbe): { status: GhCliStatus; login: string | null } {
  if (!probe.available) {
    return { status: GhCliStatus.Missing, login: null };
  }
  if (probe.login) {
    return { status: GhCliStatus.Ready, login: probe.login };
  }
  return { status: GhCliStatus.LoggedOut, login: null };
}

export function useSignInModalController({ busy, onSave }: Params) {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [cliStatus, setCliStatus] = useState(GhCliStatus.Loading);
  const [cliLogin, setCliLogin] = useState<string | null>(null);
  const trimmed = token.trim();
  const cliReady = cliStatus === GhCliStatus.Ready;

  const applyProbe = useCallback((probe: GhCliProbe) => {
    const next = statusFromProbe(probe);
    setCliStatus(next.status);
    setCliLogin(next.login);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCliStatus(GhCliStatus.Loading);
    void api()
      .probeGhAuth()
      .then((probe) => {
        if (!cancelled) {
          applyProbe(probe);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCliStatus(GhCliStatus.Missing);
          setCliLogin(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyProbe]);

  function onCopyCommand() {
    void copyToClipboard(GH_AUTH_LOGIN_COMMAND).then((ok) => {
      if (ok) {
        setCopied(true);
      }
    });
  }

  function onOpenTokenPage() {
    void api().openUrl(GITHUB_PAT_CREATE_URL);
  }

  async function onUseCli() {
    if (busy) {
      return;
    }
    if (cliReady) {
      onSave(undefined);
      return;
    }
    setCliStatus(GhCliStatus.Loading);
    try {
      const next = applyProbe(await api().probeGhAuth());
      if (next.status === GhCliStatus.Ready) {
        onSave(undefined);
      }
    } catch {
      setCliStatus(GhCliStatus.Missing);
      setCliLogin(null);
    }
  }

  function onConnectToken() {
    if (busy || !trimmed) {
      return;
    }
    onSave(trimmed);
  }

  return {
    token,
    copied,
    cliStatus,
    cliLogin,
    canConnectToken: Boolean(trimmed) && !busy,
    command: GH_AUTH_LOGIN_COMMAND,
    onTokenChange: setToken,
    onCopyCommand,
    onOpenTokenPage,
    onUseCli,
    onConnectToken,
  };
}
