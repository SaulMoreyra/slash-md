import { createContext, use } from "react";
import type { HomeControllerApi } from "../../hooks/useHomeController";

export const HomeContext = createContext<HomeControllerApi | null>(null);

export function useHome(): HomeControllerApi {
  const value = use(HomeContext);
  if (!value) {
    throw new Error("useHome must be used within Home.Provider");
  }
  return value;
}

/** Optional: EditorScreen may sit outside Home in tests. */
export function useHomeOptional(): HomeControllerApi | null {
  return use(HomeContext);
}
