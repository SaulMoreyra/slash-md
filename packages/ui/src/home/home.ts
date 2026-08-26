import "./home.css";

import { createHomeContext, createHomeDom, createHomeState } from "./context";
import { startHome } from "./homeController";
import { renderStage } from "./render/stage";
import { renderTree } from "./treeView";
import { createVsCodeHomeBridge } from "./vscode";

const dom = createHomeDom();
const state = createHomeState();

const ctx = createHomeContext(
  dom,
  state,
  () => {
    if (state.lastPayload) {
      renderTree(ctx, state.lastPayload);
    }
    renderStage(ctx);
  },
  () => renderStage(ctx),
  createVsCodeHomeBridge(),
);
startHome(ctx);
