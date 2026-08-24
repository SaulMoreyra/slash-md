import "./home.css";

import { createHomeContext, createHomeDom, createHomeState } from "./context";
import { startHome } from "./homeController";
import { renderStage } from "./render/stage";
import { renderTree } from "./treeView";

const dom = createHomeDom();
const state = createHomeState();

let ctx!: ReturnType<typeof createHomeContext>;

function refreshAll(): void {
  if (state.lastPayload) {
    renderTree(ctx, state.lastPayload);
  }
  renderStage(ctx);
}

ctx = createHomeContext(dom, state, refreshAll, () => renderStage(ctx));
startHome(ctx);
