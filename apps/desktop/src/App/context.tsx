import { createContext, use } from "react";
import type { AppControllerApi } from "./hooks/useAppController";

export const AppContext = createContext<AppControllerApi | null>(null);

export function useApp(): AppControllerApi {
  const value = use(AppContext);
  if (!value) {
    throw new Error("useApp must be used within App");
  }
  return value;
}
