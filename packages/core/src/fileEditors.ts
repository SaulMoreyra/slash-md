import type { FileEditor, FileEditorsPayload } from "./protocol";

const SEP = "\u001f";
const MAX_NAME = 80;

export type GitAuthorLine = {
  name: string;
  email: string;
  at: string;
};

export type LocalIdentity = {
  name: string;
  email: string;
  login?: string | null;
};

export function githubLoginFromEmail(email: string): string | undefined {
  const trimmed = email.trim().toLowerCase();
  const match = trimmed.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i);
  const login = match?.[1]?.trim();
  if (!login || login === "users") {
    return undefined;
  }
  return login;
}

export function githubAvatarUrl(login: string): string {
  return `https://github.com/${encodeURIComponent(login)}.png?size=64`;
}

export function identityKey(email: string, name: string): string {
  const mail = email.trim().toLowerCase();
  if (mail) {
    return `e:${mail}`;
  }
  return `n:${name.trim().toLowerCase() || "unknown"}`;
}

export function parseGitAuthorLog(stdout: string): GitAuthorLine[] {
  const lines: GitAuthorLine[] = [];
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw.trim()) {
      continue;
    }
    const [name, email, at] = raw.split(SEP);
    const iso = (at ?? "").trim();
    if (!iso || !Number.isFinite(Date.parse(iso))) {
      continue;
    }
    lines.push({
      name: (name ?? "").trim() || "Someone",
      email: (email ?? "").trim(),
      at: iso,
    });
  }
  return lines;
}

export function toFileEditor(line: GitAuthorLine, extra?: Partial<FileEditor>): FileEditor {
  const login = extra?.login ?? githubLoginFromEmail(line.email) ?? null;
  const name = clipName(line.name);
  return {
    id: extra?.id ?? identityKey(line.email, name),
    name,
    email: line.email.trim(),
    login,
    avatarUrl: extra?.avatarUrl ?? (login ? githubAvatarUrl(login) : null),
    lastEditedAt: line.at,
    commits: extra?.commits ?? 1,
  };
}

export function aggregateEditors(commits: GitAuthorLine[]): {
  editors: FileEditor[];
  createdAt: string | null;
  createdBy: string | null;
} {
  const byId = new Map<string, FileEditor>();
  let createdAt: string | null = null;
  let createdBy: string | null = null;
  for (const line of commits) {
    const editor = toFileEditor(line);
    const existing = byId.get(editor.id);
    if (existing) {
      existing.commits += 1;
      if (Date.parse(line.at) > Date.parse(existing.lastEditedAt)) {
        existing.lastEditedAt = line.at;
        existing.name = editor.name;
      }
    } else {
      byId.set(editor.id, editor);
    }
    if (!createdAt || Date.parse(line.at) <= Date.parse(createdAt)) {
      createdAt = line.at;
      createdBy = editor.name;
    }
  }
  const editors = [...byId.values()].sort(byLastEditedDesc);
  return { editors, createdAt, createdBy };
}

export function mergeLocalEditor(
  editors: FileEditor[],
  you: LocalIdentity | FileEditor | null | undefined,
  at: string,
): FileEditor[] {
  if (!you) {
    return editors;
  }
  const name = clipName(you.name);
  const email = (you.email ?? "").trim();
  if (!name && !email) {
    return editors;
  }
  const login = ("login" in you ? you.login : undefined) || githubLoginFromEmail(email) || null;
  const id = "id" in you && you.id ? you.id : identityKey(email, name);
  const avatarUrl =
    ("avatarUrl" in you ? you.avatarUrl : undefined) || (login ? githubAvatarUrl(login) : null);
  const next = editors.map((item) => ({ ...item }));
  const existing = next.find((item) => item.id === id);
  if (existing) {
    existing.lastEditedAt = at;
    existing.name = name || existing.name;
    if (login) {
      existing.login = login;
      existing.avatarUrl = avatarUrl;
    }
  } else {
    next.push({
      id,
      name: name || email || "You",
      email,
      login,
      avatarUrl,
      lastEditedAt: at,
      commits: 0,
    });
  }
  return next.sort(byLastEditedDesc);
}

export function buildEditorsPayload(opts: {
  commits: GitAuthorLine[];
  you?: LocalIdentity | FileEditor | null;
  dirty?: boolean;
  at?: string;
  fallbackAt?: string | null;
}): FileEditorsPayload {
  const aggregated = aggregateEditors(opts.commits);
  let editors = aggregated.editors;
  const now = opts.at?.trim() || new Date().toISOString();
  if (opts.dirty && opts.you) {
    editors = mergeLocalEditor(editors, opts.you, now);
  }
  const lastEditedAt =
    editors[0]?.lastEditedAt ?? aggregated.createdAt ?? opts.fallbackAt ?? null;
  return {
    editors,
    lastEditedAt,
    createdAt: aggregated.createdAt,
    createdBy: aggregated.createdBy,
    you: opts.you ? toYou(opts.you) : null,
  };
}

export function formatEditedAgo(iso: string | null | undefined, nowMs = Date.now()): string {
  if (!iso) {
    return "";
  }
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return "";
  }
  const delta = nowMs - then;
  if (delta < 45_000) {
    return "just now";
  }
  const minutes = Math.round(delta / 60_000);
  if (minutes < 2) {
    return "1 minute ago";
  }
  if (minutes < 45) {
    return `${minutes} minutes ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 2) {
    return "1 hour ago";
  }
  if (hours < 22) {
    return `${hours} hours ago`;
  }
  const thenDate = new Date(then);
  const nowDate = new Date(nowMs);
  if (isYesterday(thenDate, nowDate)) {
    return "yesterday";
  }
  const sameYear = thenDate.getFullYear() === nowDate.getFullYear();
  return thenDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

function toYou(you: LocalIdentity | FileEditor): FileEditor {
  if ("id" in you && "lastEditedAt" in you && "commits" in you) {
    return you;
  }
  return toFileEditor(
    {
      name: you.name,
      email: you.email,
      at: new Date().toISOString(),
    },
    { login: you.login ?? null, commits: 0 },
  );
}

function byLastEditedDesc(a: FileEditor, b: FileEditor): number {
  return Date.parse(b.lastEditedAt) - Date.parse(a.lastEditedAt);
}

function clipName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= MAX_NAME) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_NAME - 1)}…`;
}

function isYesterday(then: Date, now: Date): boolean {
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return (
    then.getFullYear() === y.getFullYear() &&
    then.getMonth() === y.getMonth() &&
    then.getDate() === y.getDate()
  );
}
