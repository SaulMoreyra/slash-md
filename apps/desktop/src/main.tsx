import { createRoot } from "react-dom/client";
import "@slash-md/ui/shared/tokens.css";
import "@slash-md/ui/editor/theme.css";
import { App } from "./App/App";
import { LocaleProvider } from "./i18n/LocaleProvider";
import "./i18n";
import "./styles.css";
import { ThemeProvider, applyTheme, getThemeSnapshot } from "./theme";

applyTheme(getThemeSnapshot());

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </ThemeProvider>,
);
