import { ChatMode } from "./types";

export type ChatPageContext = {
  path: string;
  /** Raw YAML frontmatter (without delimiters). */
  frontmatter: string;
  /** Markdown body, without frontmatter. */
  body: string;
  /** Repo-relative paths of sibling pages in the same folder. */
  siblings?: string[];
};

export type ChatContextBundle = {
  workspace?: {
    contentPath: string;
    mode: string;
    branch?: string | null;
  };
  page?: ChatPageContext;
  /** `sections` are configured section folders; `pages` are paths + titles only. */
  tree?: {
    sections: string[];
    pages: Array<{ path: string; title: string }>;
  };
  git?: {
    branch?: string | null;
    /** Porcelain lines, capped. */
    status: string[];
    /** Per-file line counts, e.g. `docs/a.md +12 -3`. */
    diffStat?: string[];
  };
  lote?: {
    prNumber: number;
    title: string;
    branch: string;
    paths: string[];
  };
};

export const CONTEXT_LIMITS = {
  bodyChars: 40_000,
  treePages: 200,
  gitPaths: 100,
  lotePaths: 50,
  pageSiblings: 30,
} as const;

export function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}\n\n… (truncado, ${value.length - max} caracteres omitidos)`;
}

/** Render the bundle as a compact Markdown block prepended to the prompt. */
export function serializeContext(bundle: ChatContextBundle): string {
  const lines: string[] = ["## Contexto del wiki"];
  const { workspace, page, tree, git, lote } = bundle;

  if (workspace) {
    lines.push(
      "",
      "### Workspace",
      `- Modo: ${workspace.mode}`,
      `- contentPath: ${workspace.contentPath || "(raíz del repo)"}`,
      `- Rama: ${workspace.branch || "(sin git)"}`,
    );
  }

  if (page) {
    lines.push("", `### Página actual: ${page.path}`);
    if (page.frontmatter.trim()) {
      lines.push("Frontmatter:", "~~~yaml", page.frontmatter.trim(), "~~~");
    }
    lines.push(
      "Cuerpo:",
      "~~~markdown",
      truncate(page.body.trim(), CONTEXT_LIMITS.bodyChars).trim(),
      "~~~",
    );
    if (page.siblings?.length) {
      lines.push("Hermanas (misma carpeta):");
      for (const entry of page.siblings.slice(0, CONTEXT_LIMITS.pageSiblings)) {
        lines.push(`- ${entry}`);
      }
    }
  }

  if (tree && (tree.sections.length || tree.pages.length)) {
    lines.push("", "### Wiki");
    if (tree.sections.length) {
      lines.push(`Secciones: ${tree.sections.join(", ")}`);
    }
    const pages = tree.pages.slice(0, CONTEXT_LIMITS.treePages);
    if (pages.length) {
      lines.push("Páginas (ruta — título):");
      for (const entry of pages) {
        lines.push(`- ${entry.path} — ${entry.title}`);
      }
      if (tree.pages.length > pages.length) {
        lines.push(`- … ${tree.pages.length - pages.length} páginas más`);
      }
    }
  }

  if (git && (git.status.length || git.diffStat?.length)) {
    lines.push("", "### Git");
    if (git.branch) {
      lines.push(`Rama: ${git.branch}`);
    }
    if (git.status.length) {
      lines.push("Archivos con cambios:");
      for (const entry of git.status.slice(0, CONTEXT_LIMITS.gitPaths)) {
        lines.push(`- ${entry}`);
      }
    }
    if (git.diffStat?.length) {
      lines.push("Diff (líneas):");
      for (const entry of git.diffStat.slice(0, CONTEXT_LIMITS.gitPaths)) {
        lines.push(`- ${entry}`);
      }
    }
  }

  if (lote) {
    lines.push(
      "",
      "### Lote en revisión",
      `- PR #${lote.prNumber}: ${lote.title}`,
      `- Rama: ${lote.branch}`,
      "- Páginas:",
    );
    for (const path of lote.paths.slice(0, CONTEXT_LIMITS.lotePaths)) {
      lines.push(`  - ${path}`);
    }
  }

  return lines.join("\n");
}

export function buildPrompt(input: { mode: ChatMode; prompt: string; context?: string }): string {
  const sections: string[] = [];
  if (input.context?.trim()) {
    sections.push(input.context.trim());
  }
  if (input.mode === ChatMode.EditPage) {
    sections.push(
      [
        "# Tarea: editar la página actual",
        "Devuelve **únicamente** el markdown completo y actualizado del cuerpo de la página (sin frontmatter YAML).",
        "No añadas explicaciones ni texto fuera del bloque. Envuelve el resultado en un bloque ```markdown.",
        "",
        "## Cambio solicitado",
        input.prompt.trim(),
      ].join("\n"),
    );
  } else {
    sections.push(
      ["# Pregunta", input.prompt.trim(), "", "Responde en el mismo idioma de la pregunta."].join("\n"),
    );
  }
  return sections.join("\n\n---\n\n");
}
