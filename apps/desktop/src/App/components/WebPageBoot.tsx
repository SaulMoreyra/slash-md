import { useEffect, useRef } from "react";
import { useApp } from "../context";
import { AppPhase } from "../enums";
import { getWebBoot } from "../../host";

/** Static site: auto-open the document the shell booted into (no-op on Electron). */
export function WebPageBoot() {
  const { phase, actions } = useApp();
  const bootedRef = useRef(false);

  useEffect(() => {
    const boot = getWebBoot();
    if (!boot?.page || phase !== AppPhase.Workspace || bootedRef.current) {
      return;
    }
    bootedRef.current = true;
    void actions.onOpenPage(boot.page);
  }, [phase, actions]);

  return null;
}

WebPageBoot.displayName = "App.WebPageBoot";