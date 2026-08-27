import { RepoMode, type SlashmdFile, type SlashmdSite } from "./configTypes";
import { normalizeContentPathInput } from "./paths";
import { normalizeBasePath } from "./sitePages";

const REPO_RE = /^[^/\s]+\/[^/\s]+$/;

export function parseSlashmd(raw: unknown): SlashmdFile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const rec = raw as Record<string, unknown>;
  const out: SlashmdFile = {};
  const repo = typeof rec.repo === "string" ? rec.repo : undefined;
  if (repo && REPO_RE.test(repo.trim().replace(/\.git$/i, ""))) {
    out.repo = repo.trim().replace(/\.git$/i, "");
  }
  if (typeof rec.contentPath === "string") {
    out.contentPath = normalizeContentPathInput(rec.contentPath);
  }
  if (typeof rec.defaultBranch === "string" && rec.defaultBranch.trim()) {
    out.defaultBranch = rec.defaultBranch.trim();
  }
  if (rec.mode === RepoMode.Personal || rec.mode === RepoMode.Workspace || rec.mode === RepoMode.Local) {
    out.mode = rec.mode;
  }
  if (Array.isArray(rec.sections)) {
    out.sections = rec.sections.filter((s): s is string => typeof s === "string" && Boolean(s.trim()));
  }
  if (typeof rec.templatesPath === "string" && rec.templatesPath.trim()) {
    out.templatesPath = rec.templatesPath.trim().replace(/^\/+|\/+$/g, "");
  }
  const site = parseSlashmdSite(rec.site);
  if (site) {
    out.site = site;
  }
  return out;
}

export function siteEnabled(file: SlashmdFile): boolean {
  return file.site?.enabled === true;
}

function parseSlashmdSite(raw: unknown): SlashmdSite | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const rec = raw as Record<string, unknown>;
  const site: SlashmdSite = { enabled: rec.enabled === true };
  if (typeof rec.name === "string" && rec.name.trim()) {
    site.name = rec.name.trim();
  }
  if (typeof rec.basePath === "string") {
    site.basePath = normalizeBasePath(rec.basePath);
  }
  return site;
}
