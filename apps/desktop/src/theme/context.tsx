import { createContext, use } from "react";
import type { AppTheme } from "../../shared/api";
import type { ThemeSource } from "./enums";

export type ThemeContextValue = {
  theme: AppTheme;
  source: ThemeSource;
  setTheme: (theme: AppTheme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
