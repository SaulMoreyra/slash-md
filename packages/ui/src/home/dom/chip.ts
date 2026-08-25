export function chip(label: string, variant: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = variant.includes("fill")
    ? "cta-fill"
    : variant.includes("outline")
      ? "cta-outline"
      : variant.includes("danger") && !variant.includes("ghost")
        ? "cta-outline danger"
        : `cta-ghost${variant.includes("danger") ? " danger" : ""}`;
  btn.textContent = label;
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    onClick();
  });
  return btn;
}
