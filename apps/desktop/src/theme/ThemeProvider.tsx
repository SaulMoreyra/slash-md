import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppTheme } from "../../shared/api";
import { ThemeContext } from "./context";
import { ThemeSource } from "./enums";
import { applyTheme, getThemeSnapshot, resolveThemeSource } from "./theme";

type Props = {
  children: ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const snapshot = getThemeSnapshot();
    applyTheme(snapshot);
    return snapshot;
  });
  const [source, setSource] = useState<ThemeSource>(() => resolveThemeSource());

  useEffect(() => {
    const subscribe = window.slashmd?.onTheme;
    if (!subscribe) {
      return;
    }
    return subscribe((osTheme) => {
      if (source === ThemeSource.User) {
        return;
      }
      applyTheme(osTheme);
      setThemeState(osTheme);
    });
  }, [source]);

  const setTheme = useCallback((next: AppTheme) => {
    applyTheme(next);
    setThemeState(next);
    setSource(ThemeSource.User);
    void window.slashmd?.setTheme?.(next);
  }, []);

  const value = useMemo(
    () => ({ theme, source, setTheme }),
    [theme, source, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
