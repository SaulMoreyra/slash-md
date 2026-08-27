/** Whether a `pub/…` branch belongs in the current user’s publication list. */

export type PublicationPullInfo = {
  author: string | null;
};

export function sameGithubLogin(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * `pull`:
 * - `undefined` — GitHub lookup failed (keep local drafts).
 * - `null` — lookup ok, no open PR.
 * - object — open PR for this head.
 */
export function isOwnPublication(opts: {
  login: string | null;
  local: boolean;
  pull: PublicationPullInfo | null | undefined;
}): boolean {
  const { login, local, pull } = opts;
  if (pull === undefined) {
    return local;
  }
  if (pull) {
    if (!login || !pull.author) {
      return false;
    }
    return sameGithubLogin(login, pull.author);
  }
  return local;
}
