import { createRoot } from "react-dom/client";
import "@slash-md/ui/shared/tokens.css";
import "@slash-md/ui/editor/theme.css";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
