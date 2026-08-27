import { render, type RenderOptions } from "@testing-library/react";
import { Toast } from "@heroui/react";
import type { ReactElement } from "react";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { ThemeProvider } from "../theme";

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider>
        <LocaleProvider>
          <Toast.Provider placement="bottom end" maxVisibleToasts={3} />
          {children}
        </LocaleProvider>
      </ThemeProvider>
    ),
    ...options,
  });
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
