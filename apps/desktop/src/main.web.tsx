import { createRoot } from "react-dom/client";
import { Toast } from "@heroui/react";
import "@slash-md/ui/shared/tokens.css";
import "@slash-md/ui/editor/theme.css";
import { App } from "./App/App";
import { LocaleProvider } from "./i18n/LocaleProvider";
import "./i18n";
import "./styles.css";
import { ThemeProvider, applyTheme, getThemeSnapshot } from "./theme";
import { createWebApi } from "./web/api";
import { installWebLinkNavigation } from "./web/links";

applyTheme(getThemeSnapshot());
window.slashmd = createWebApi();
installWebLinkNavigation();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LocaleProvider>
      <Toast.Provider placement="bottom end" maxVisibleToasts={3} />
      <App />
    </LocaleProvider>
  </ThemeProvider>,
);