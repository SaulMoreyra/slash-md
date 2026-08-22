import { Window } from "happy-dom";

const happy = new Window({
  url: "http://localhost/",
  width: 1024,
  height: 768,
});

const g = globalThis;

g.window = happy;
g.document = happy.document;
g.addEventListener = happy.addEventListener.bind(happy);
g.removeEventListener = happy.removeEventListener.bind(happy);
g.dispatchEvent = happy.dispatchEvent.bind(happy);
g.getComputedStyle = happy.getComputedStyle.bind(happy);
g.requestAnimationFrame = happy.requestAnimationFrame.bind(happy);
g.cancelAnimationFrame = happy.cancelAnimationFrame.bind(happy);
g.getSelection = () => happy.getSelection();

const skip = new Set([
  "window",
  "document",
  "console",
  "global",
  "process",
  "Buffer",
  "URL",
  "URLSearchParams",
  "Function",
  "Object",
  "Array",
  "Boolean",
  "Number",
  "String",
  "Symbol",
  "Promise",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Date",
  "RegExp",
  "Error",
  "ArrayBuffer",
  "JSON",
  "Math",
  "Reflect",
  "Proxy",
  "Intl",
  "eval",
  "isNaN",
  "parseInt",
  "parseFloat",
  "NaN",
  "Infinity",
  "undefined",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "setImmediate",
  "queueMicrotask",
  "performance",
]);
const names = new Set([
  ...Object.getOwnPropertyNames(happy),
  ...Object.getOwnPropertyNames(Object.getPrototypeOf(happy)),
]);
for (const name of names) {
  if (skip.has(name)) {
    continue;
  }
  const value = happy[name];
  if (typeof value === "function") {
    g[name] = value;
  }
}

const { run } = await import("../dist/test-roundtrip.mjs");
await run();
