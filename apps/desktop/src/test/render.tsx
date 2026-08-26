import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { LocaleProvider } from "../i18n/LocaleProvider";

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    wrapper: ({ children }) => <LocaleProvider>{children}</LocaleProvider>,
    ...options,
  });
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
