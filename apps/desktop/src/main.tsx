import { createRoot } from "react-dom/client";
import "@slash-md/ui/shared/tokens.css";
import "@slash-md/ui/editor/theme.css";
import { App } from "./App/App";
import { LocaleProvider } from "./i18n/LocaleProvider";
import "./i18n";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <App />
  </LocaleProvider>,
);
