/** True when the user is editing the YAML hero title (contenteditable). */
export function isHeroTitleFocused(): boolean {
  const hero = document.getElementById("hero-title");
  if (!hero) {
    return false;
  }
  const active = document.activeElement;
  return active === hero || hero.contains(active);
}

/** Update hero title without resetting the caret when the user is typing. */
export function applyHeroTitle(hero: HTMLElement, title: string): void {
  if (isHeroTitleFocused()) {
    hero.classList.toggle("is-empty", !title.trim());
    return;
  }
  if ((hero.textContent ?? "") !== title) {
    hero.textContent = title;
  }
  document.title = title || "Untitled";
  hero.classList.toggle("is-empty", !title.trim());
}
