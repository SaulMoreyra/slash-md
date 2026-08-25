/** Avatar chip: photo when available, otherwise author initial. */
export function fillAuthorAvatar(
  host: HTMLElement,
  opts: { author: string; avatarUrl?: string | null; size?: number },
): void {
  host.replaceChildren();
  host.setAttribute("aria-hidden", "true");
  const initial = (opts.author || "?").slice(0, 1).toUpperCase();
  const url = opts.avatarUrl?.trim();
  if (!url) {
    host.textContent = initial;
    return;
  }
  const img = document.createElement("img");
  img.className = "slash-avatar-img";
  img.src = sizeUrl(url, opts.size ?? 64);
  img.alt = "";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => {
    host.replaceChildren();
    host.textContent = initial;
  });
  host.appendChild(img);
}

/** Prefer a sized GitHub avatar when the URL supports `s=`. */
function sizeUrl(url: string, size: number): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("githubusercontent.com") || u.hostname === "avatars.githubusercontent.com") {
      u.searchParams.set("s", String(size));
    }
    return u.toString();
  } catch {
    return url;
  }
}
