import { chip } from "./chip";

export function emptyPanel(opts: {
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}): HTMLElement {
  const wrap = document.createElement("header");
  wrap.className = "head-hang";
  const title = document.createElement("h1");
  title.textContent = opts.title;
  const body = document.createElement("p");
  body.className = "lede";
  body.textContent = opts.body;
  const actions = document.createElement("div");
  actions.className = "hang-actions";
  actions.appendChild(chip(opts.action.label, "fill", opts.action.onClick));
  wrap.append(title, body, actions);
  return wrap;
}
