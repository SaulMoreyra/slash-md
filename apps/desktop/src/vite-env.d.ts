/// <reference types="vite/client" />

import type { DesktopApi } from "../shared/api";

declare global {
  interface Window {
    slashmd: DesktopApi;
    __SLASHMD_INITIAL_THEME__?: import("../shared/api").AppTheme | null;
  }
}

export {};
