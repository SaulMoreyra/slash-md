import { readFile } from "node:fs/promises";
import path from "node:path";
import { setFrontmatterField, splitFrontmatter } from "@slash-md/core/frontmatter";
import { pageIcon, normalizePageIcon } from "@slash-md/core/pageIcon";
import {
  aggregateEditors,
  buildEditorsPayload,
  formatEditedAgo,
  githubLoginFromEmail,
  parseGitAuthorLog,
} from "@slash-md/core/fileEditors";
import { rewriteLinksForMove, rewriteLinksTo } from "@slash-md/core/links";
import {
  referencedImages,
  sanitizeImageName,
  uniqueImageRepoPath,
} from "@slash-md/core/images";
import {
  reviewContextBannerText,
  shouldShowReviewContextBanner,
} from "@slash-md/core/reviewContext";
import { groupHomeLevel } from "@slash-md/core/homeTree";
import {
  contentPathPrefix,
  imageMarkdownSrc,
  isUnderContentPath,
  normalizeContentPathInput,
} from "@slash-md/core/paths";
import {
  humanizeTemplateId,
  isTemplateRepoPath,
  mergeTemplatePicks,
  parseTemplateManifest,
  resolveTemplatesPath,
  templateIdFromFilename,
  workspaceTemplatePicks,
} from "@slash-md/core/templates";
import { parsePrNumber, reviewThreadTarget } from "@slash-md/core/threadGate";
import { codeFenceTags, codeLanguages } from "../../packages/ui/src/editor/plugins/languages";
import { slashItemsMatching } from "../../packages/ui/src/editor/plugins/slash";
import type { SuiteCtx } from "../harness";

export async function runDomainSuite(ctx: SuiteCtx): Promise<void> {
  const { assert, root } = ctx;

  assert(slashItemsMatching("h1").includes("h1"), "/h1 matches Heading 1");
  assert(slashItemsMatching("title1").includes("h1"), "/title1 matches Heading 1");
  assert(slashItemsMatching("code").includes("code"), "/code matches code block");
  assert(slashItemsMatching("callout").includes("callout"), "/callout matches callout");
  assert(slashItemsMatching("info").includes("callout"), "/info matches callout");
  assert(slashItemsMatching("warning").includes("warning"), "/warning matches warning");
  assert(slashItemsMatching("tip").includes("tip"), "/tip matches tip callout");
  assert(slashItemsMatching("important").includes("important"), "/important matches important callout");
  assert(slashItemsMatching("caution").includes("caution"), "/caution matches caution callout");
  assert(slashItemsMatching("toggle").includes("toggle"), "/toggle matches toggle");
  assert(slashItemsMatching("diagram").includes("diagram"), "/diagram matches flowchart");
  assert(slashItemsMatching("mermaid").includes("diagram"), "/mermaid matches flowchart");
  assert(slashItemsMatching("flowchart").includes("diagram"), "/flowchart matches flowchart");
  assert(!slashItemsMatching("h1").includes("h2"), "/h1 does not match H2");

  {
    const tags = codeFenceTags();
    assert(codeLanguages.length >= 140, "language-data catalog is loaded");
    assert(tags.length === new Set(tags).size, "fence tags are unique");
    assert(
      tags.every((tag) => tag.length > 0 && !/[\s`]/.test(tag)),
      "fence tags are single tokens",
    );
    const gallery = await readFile(path.join(root, "apps/vscode/templates/gallery.md"), "utf8");
    const missing = tags.filter((tag) => !gallery.includes("```" + tag + "\n"));
    assert(
      missing.length === 0,
      missing.length === 0 ? "gallery has every language fence" : `gallery missing ${missing.join(",")}`,
    );
    assert(gallery.includes("> [!NOTE]"), "gallery has note callout");
    assert(gallery.includes("> [!TIP]"), "gallery has tip callout");
    assert(gallery.includes("> [!IMPORTANT]"), "gallery has important callout");
    assert(gallery.includes("> [!WARNING]"), "gallery has warning callout");
    assert(gallery.includes("> [!CAUTION]"), "gallery has caution callout");
    assert(gallery.includes("<details>"), "gallery has toggle");
    assert(gallery.includes("| Col A | Col B"), "gallery has table");
    assert(gallery.includes("```mermaid"), "gallery has mermaid flowchart");
    assert(gallery.includes("flowchart TD"), "gallery flowchart is a flow");
  }

  {
    const src = "---\ntitle: Uno\nstatus: draft\nupdated: 2026-08-21\n---\n\n# Uno\n";
    const next = setFrontmatterField(src, "status", "review");
    assert(next.includes("status: review"), "frontmatter status updates");
    assert(next.split("\n").filter((line) => line.startsWith("title:")).length === 1, "frontmatter keeps title");
    const titleLine = src.split("\n").find((line) => line.startsWith("title:"));
    const nextTitle = next.split("\n").find((line) => line.startsWith("title:"));
    assert(titleLine === nextTitle, "editing status does not rewrite title line");
    assert(splitFrontmatter(next).body === splitFrontmatter(src).body, "frontmatter edit keeps body");
    const stamped = setFrontmatterField(src, "status", "in_review");
    assert(stamped.includes("status: in_review"), "status writes in_review");
    assert(!/status:\s*review\b/.test(stamped), "in_review is not status: review");
    const withPr = setFrontmatterField(src, "pr", "42");
    assert(withPr.includes("pr: 42"), "pr writes as a YAML number");
    assert(!withPr.includes('pr: "42"'), "pr is not quoted");
    assert(splitFrontmatter(withPr).fields.pr === "42", "pr parses back as a string field");
    const withBranch = setFrontmatterField(withPr, "reviewBranch", "review/docs-2026-08");
    assert(withBranch.includes("reviewBranch: review/docs-2026-08"), "reviewBranch writes");
    assert(parsePrNumber("42") === 42, "yaml pr parses as integer");
    assert(parsePrNumber("0") === undefined, "pr 0 is ignored");
    const reviewing = setFrontmatterField(withPr, "status", "in_review");
    const yamlGate = reviewThreadTarget({
      markdown: reviewing,
      fileRemotePath: "docs/foo.md",
    });
    assert(yamlGate?.prNumber === 42 && yamlGate.remotePath === "docs/foo.md", "in_review + yaml pr loads threads");
    assert(
      reviewThreadTarget({
        markdown: setFrontmatterField(src, "status", "published"),
        draftPr: 42,
        fileRemotePath: "docs/foo.md",
      }) === undefined,
      "published status does not load threads",
    );
    assert(
      reviewThreadTarget({
        markdown: src,
        fileRemotePath: "docs/foo.md",
      }) === undefined,
      "draft without pr does not load threads",
    );
    const sidecarGate = reviewThreadTarget({
      markdown: src,
      draftPr: 7,
      draftRemotePath: "docs/legacy.md",
    });
    assert(
      sidecarGate?.prNumber === 7 && sidecarGate.remotePath === "docs/legacy.md",
      "open PR meta still loads threads without yaml",
    );
    const dropped = setFrontmatterField(withPr, "pr", "");
    assert(!/^pr:/m.test(dropped), "empty pr is dropped from YAML");
  }

  {
    const src = "---\ntitle: Cover\n---\n\n# Cover\n";
    const withCover = setFrontmatterField(src, "cover", "../images/banner.jpg");
    assert(withCover.includes("cover: ../images/banner.jpg"), "frontmatter cover sets path");
    assert(splitFrontmatter(withCover).body === splitFrontmatter(src).body, "cover edit keeps body");
    const cleared = setFrontmatterField(withCover, "cover", "");
    assert(!cleared.includes("cover:"), "empty cover drops YAML line");
    assert(splitFrontmatter(cleared).fields.cover === "", "cleared cover field is empty");
  }

  {
    const src = "---\ntitle: Launch\n---\n\n# Launch\n";
    const withIcon = setFrontmatterField(src, "icon", "🚀");
    assert(splitFrontmatter(withIcon).fields.icon === "🚀", "frontmatter icon stores emoji");
    assert(splitFrontmatter(withIcon).body === splitFrontmatter(src).body, "icon edit keeps body");
    const cleared = setFrontmatterField(withIcon, "icon", "");
    assert(!cleared.includes("icon:"), "empty icon drops YAML line");
    assert(splitFrontmatter(cleared).fields.icon === "", "cleared icon field is empty");
    assert(normalizePageIcon("🚀 extra") === "🚀", "icon keeps first grapheme");
    assert(normalizePageIcon("hello") === "", "icon rejects plain text");
    assert(normalizePageIcon("color:#D3E5EF") === "", "icon rejects color covers");
    assert(pageIcon(withIcon) === "🚀", "pageIcon reads YAML");
    assert(pageIcon(src) === "", "pageIcon empty without icon field");
  }

  {
    const sep = "\u001f";
    const log = [
      `Saul${sep}42+saul@users.noreply.github.com${sep}2026-08-23T12:00:00.000Z`,
      `Jane${sep}jane@users.noreply.github.com${sep}2026-08-10T12:00:00.000Z`,
      `Saul${sep}42+saul@users.noreply.github.com${sep}2026-08-01T12:00:00.000Z`,
    ].join("\n");
    const commits = parseGitAuthorLog(log);
    assert(commits.length === 3, "git author log parses 3 lines");
    const { editors, createdAt, createdBy } = aggregateEditors(commits);
    assert(editors.length === 2, "editors collapse by email");
    assert(editors[0]?.name === "Saul" && editors[0].commits === 2, "latest editor is first with commit count");
    assert(editors[1]?.name === "Jane" && editors[1].commits === 1, "second editor keeps one commit");
    assert(createdBy === "Saul" && createdAt === "2026-08-01T12:00:00.000Z", "created is oldest commit");
    assert(githubLoginFromEmail("42+saul@users.noreply.github.com") === "saul", "noreply id+login");
    assert(githubLoginFromEmail("jane@users.noreply.github.com") === "jane", "noreply login");
    assert(githubLoginFromEmail("saul@gmail.com") === undefined, "gmail is not a github login");
    const dirty = buildEditorsPayload({
      commits,
      you: { name: "Jane", email: "jane@users.noreply.github.com" },
      dirty: true,
      at: "2026-08-23T15:00:00.000Z",
    });
    assert(dirty.editors[0]?.name === "Jane", "dirty local editor bubbles to top");
    assert(dirty.editors[0]?.lastEditedAt === "2026-08-23T15:00:00.000Z", "dirty uses local timestamp");
    const now = Date.parse("2026-08-23T15:00:10.000Z");
    assert(formatEditedAgo("2026-08-23T15:00:00.000Z", now) === "just now", "edited just now");
    assert(formatEditedAgo("2026-08-23T14:00:00.000Z", now) === "1 hour ago", "edited 1 hour ago");
  }

  {
    const md = "---\ntitle: X\ncover: ../images/x.jpg\n---\n\n# X\n\n![](../images/inline.png)\n";
    const refs = referencedImages(md, "docs/prd/x.md");
    assert(
      refs.some((r) => r.src === "../images/x.jpg" && r.repoPath === "docs/images/x.jpg"),
      "referencedImages includes cover path",
    );
    assert(refs.some((r) => r.src === "../images/inline.png"), "referencedImages still includes body images");
  }

  {
    const md = "---\ntitle: X\ncover: https://example.com/banner.jpg\n---\n\n# X\n";
    assert(referencedImages(md, "docs/x.md").length === 0, "referencedImages ignores https cover");
  }

  {
    const md = "---\ntitle: X\ncover: color:#D3E5EF\n---\n\n# X\n";
    assert(referencedImages(md, "docs/x.md").length === 0, "referencedImages ignores color cover");
    assert(splitFrontmatter(md).fields.cover === "color:#D3E5EF", "color cover stored in YAML");
  }

  {
    const md = "---\ntitle: X\ncover: ../images/banner.jpg\n---\n\n# X\n\nSee [pic](../images/banner.jpg).\n";
    const moved = rewriteLinksForMove(md, "docs/prd/x.md", "docs/prd/nested/x.md");
    assert(
      splitFrontmatter(moved).fields.cover === "../../images/banner.jpg",
      "move rewrites cover relative path",
    );
  }

  assert(imageMarkdownSrc("docs/foo.md", "docs", "pic.png") === "images/pic.png", "image src at docs root");
  assert(imageMarkdownSrc("docs/prd/foo.md", "docs", "pic.png") === "../images/pic.png", "image src nested");

  {
    assert(sanitizeImageName("My Photo!!.PNG") === "My-Photo-.PNG", "sanitize image name");
    assert(sanitizeImageName("noext") === "noext.png", "sanitize adds png");
    const taken = new Set<string>();
    const first = uniqueImageRepoPath("docs", "pic.png", taken);
    const second = uniqueImageRepoPath("docs", "pic.png", taken);
    assert(first === "docs/images/pic.png", "first upload path");
    assert(second === "docs/images/pic-2.png", "collision gets -2 suffix");
    assert(uniqueImageRepoPath("", "hero.jpg", new Set()) === "images/hero.jpg", "root contentPath images");
  }

  {
    assert(
      !shouldShowReviewContextBanner({
        localPr: 42,
        inboxPr: 42,
        localBranch: "review/docs-2026-08",
        reviewBranch: "review/docs-2026-08",
      }).show,
      "aligned PR + branch hides banner",
    );
    assert(
      shouldShowReviewContextBanner({
        localPr: 41,
        inboxPr: 42,
        localBranch: "review/docs-2026-08",
        reviewBranch: "review/docs-2026-08",
      }).reason === "pr",
      "different PR shows banner",
    );
    assert(
      shouldShowReviewContextBanner({
        localPr: 42,
        inboxPr: 42,
        localBranch: "main",
        reviewBranch: "review/docs-2026-08",
      }).reason === "branch",
      "different branch shows banner",
    );
    assert(
      shouldShowReviewContextBanner({
        inboxPr: 42,
        missingFile: true,
      }).reason === "missing",
      "missing file shows banner",
    );
    assert(
      reviewContextBannerText({
        prNumber: 42,
        localBranch: "main",
        reviewBranch: "review/docs-2026-08",
        reason: "branch",
      }).includes("PR #42"),
      "banner text names PR",
    );
  }

  {
    const md = "---\ntitle: Nested\ncover: ../images/hero.png\n---\n\n![shot](../images/shot.png)\n";
    const refs = referencedImages(md, "docs/producto/nota.md");
    assert(
      refs.every((r) => r.repoPath.startsWith("docs/images/")),
      "nested wiki page images resolve under contentPath/images",
    );
    assert(refs.length === 2, "cover + body image");
  }

  {
    const other = "Lee [este](../old/doc.md) y [otro](https://example.com).";
    const rewritten = rewriteLinksTo(other, "docs/prd/a.md", "docs/old/doc.md", "docs/new/doc.md");
    assert(rewritten.includes("](../new/doc.md)"), "rename rewrites relative link");
    assert(rewritten.includes("https://example.com"), "rename keeps external link");
  }

  assert(resolveTemplatesPath("docs") === "docs/_templates", "default templates path");
  assert(resolveTemplatesPath("docs", "templates/custom") === "templates/custom", "custom templates path");
  assert(resolveTemplatesPath(".") === "_templates", "root contentPath templates");
  assert(resolveTemplatesPath("") === "_templates", "empty contentPath templates");
  assert(normalizeContentPathInput(".") === ".", "normalize . to .");
  assert(normalizeContentPathInput("") === ".", "normalize empty to .");
  assert(normalizeContentPathInput("./") === ".", "normalize ./ to .");
  assert(normalizeContentPathInput("docs/") === "docs", "normalize docs/");
  assert(contentPathPrefix(".") === "", "prefix . is empty");
  assert(contentPathPrefix("docs") === "docs", "prefix docs");
  {
    const acturo = [
      "README.md",
      "docs/AGENTS.md",
      "docs/architecture.md",
      "docs/wiki/acturo.md",
      "docs/wiki/index.md",
      "docs/prds-fase-1-mvp/01-register.md",
      "docs/prds-fase-1-mvp/index.md",
      "docs/prds-fase-2/index.md",
      "docs/prds-fase-3/index.md",
      "docs/prds-luego/index.md",
    ];
    const root = groupHomeLevel("", acturo);
    assert(!root.folders.includes("/docs"), "repo-root wiki does not prefix folders with /");
    assert(root.folders.includes("docs"), "repo-root wiki lists docs");
    assert(root.files.includes("README.md"), "repo-root wiki lists README");
    const fromDot = groupHomeLevel(".", acturo);
    assert(fromDot.folders.includes("docs") && !fromDot.folders.includes("/docs"), "dot dir groups like empty");
    const docs = groupHomeLevel("docs", acturo);
    assert(docs.files.includes("docs/AGENTS.md"), "docs root lists markdown");
    assert(docs.folders.includes("docs/wiki"), "docs lists wiki");
    assert(docs.folders.includes("docs/prds-fase-1-mvp"), "docs lists prds-fase-1-mvp");
    assert(docs.folders.includes("docs/prds-fase-2"), "docs lists prds-fase-2");
    assert(docs.folders.includes("docs/prds-fase-3"), "docs lists prds-fase-3");
    assert(docs.folders.includes("docs/prds-luego"), "docs lists prds-luego");
    const wiki = groupHomeLevel("docs/wiki", acturo);
    assert(wiki.files.includes("docs/wiki/acturo.md"), "wiki folder lists pages");
    assert(wiki.folders.length === 0, "wiki has no nested folders");
    const nested = groupHomeLevel("docs", acturo.filter((path) => path.startsWith("docs/")));
    assert(nested.folders.length === 5, "contentPath docs still lists every child folder");
  }
  assert(isUnderContentPath("guide.md", "."), "root allows top-level md");
  assert(isUnderContentPath("producto/a.md", "."), "root allows nested md");
  assert(isUnderContentPath("docs/a.md", "docs"), "docs prefix match");
  assert(!isUnderContentPath("other/a.md", "docs"), "docs prefix reject");
  assert(templateIdFromFilename("onboarding.md") === "onboarding", "template id from filename");
  assert(templateIdFromFilename("_manifest.json") === undefined, "manifest is not a template");
  assert(humanizeTemplateId("my-spec") === "My Spec", "humanize template id");
  assert(isTemplateRepoPath("docs/_templates/foo.md", "docs/_templates"), "path under templates folder");
  assert(!isTemplateRepoPath("docs/producto/foo.md", "docs/_templates"), "normal page is not template");
  const merged = mergeTemplatePicks(
    [{ id: "spec", label: "Team Spec", description: "Ours", source: "workspace" }],
    [{ id: "spec", label: "Spec", description: "Built-in", source: "builtin" }],
  );
  assert(merged.find((p) => p.id === "spec")?.label === "Team Spec", "workspace template overrides builtin");
  const manifest = parseTemplateManifest({ onboarding: { label: "Onboarding", description: "New hire" } });
  assert(manifest.onboarding?.label === "Onboarding", "parse template manifest");
  const wsPicks = workspaceTemplatePicks(["onboarding.md", "_manifest.json"], manifest);
  assert(wsPicks.length === 1 && wsPicks[0]?.id === "onboarding", "workspace picks from filenames");
}
