import { useEffect, useRef } from "react";
import type { MenuAction } from "../../../shared/menu";

export function useMenuActions(handlers: Partial<Record<MenuAction, () => void>>): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const subscribe = window.slashmd?.onMenuAction;
    if (!subscribe) {
      return;
    }
    return subscribe((action) => {
      handlersRef.current[action]?.();
    });
  }, []);
}
