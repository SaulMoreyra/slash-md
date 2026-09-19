import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { AGENT_PRESETS, findAgentPreset } from "@slash-md/agents/adapters";
import {
  CONTEXT_LIMITS,
  buildPrompt,
  serializeContext,
  type ChatContextBundle,
} from "@slash-md/agents/context";
import { ChatStream } from "@slash-md/agents/stream";
import {
  ChatScope,
  type AgentInfo,
  type AgentRecipe,
  type ChatEnvelope,
  type ChatRequest,
} from "@slash-md/agents/types";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import { getContentConfig, readSlashmd } from "./config";
import { currentBranchName, isGitWorkspace, runGit } from "./git";
import { loadPage } from "./pages";
import { getPublicationState } from "./publication";
import { getWorkspaceRoot, readStaging } from "./session";
import { buildSearchIndex, configuredSections } from "./workspace";

type ChatPush = (message: ChatEnvelope) => void;

type Session = {
  id: string;
  child: ChildProcess;
  stream: ChatStream;
  reader: readline.Interface;
  timer: NodeJS.Timeout;
  stderr: string;
  bytes: number;
  exited: boolean;
  terminated: boolean;
};

const IDLE_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

const sessions = new Map<string, Session>();

export async function listChatAgents(): Promise<AgentInfo[]> {
  const root = getWorkspaceRoot();
  const file = root ? await readSlashmd(root) : {};
  const configured = file.mcp?.agent?.name?.trim();
  const infos: AgentInfo[] = [];
  if (configured && !findAgentPreset(configured)) {
    infos.push({
      name: configured,
      label: configured,
      command: configured,
      available: await isCommandAvailable(configured),
    });
  }
  for (const preset of AGENT_PRESETS) {
    infos.push({
      name: preset.name,
      label: preset.label,
      command: preset.command,
      available: await isCommandAvailable(preset.command),
    });
  }
  return infos;
}

export async function startChat(request: ChatRequest, push: ChatPush): Promise<{ sessionId: string }> {
  abortAllChats();
  if (!request.prompt.trim()) {
    throw new Error("Escribe una pregunta antes de enviar.");
  }
  const root = getWorkspaceRoot();
  const { recipe, env } = await resolveAgent(root, request.agent);
  if (!(await isCommandAvailable(recipe.command))) {
    throw new Error(
      `No se encontró el agente "${recipe.command}" en PATH. Instálalo o ajusta "mcp.agent" en .slashmd.json.`,
    );
  }

  const sessionId = randomUUID();
  const stream = new ChatStream(recipe.name, request.mode, (event) => push({ sessionId, event }));
  push({ sessionId, event: { type: "started", agent: recipe.label } });

  let prompt: string;
  try {
    const bundle = await composeContext(request);
    const context = Object.keys(bundle).length ? serializeContext(bundle) : undefined;
    prompt = buildPrompt({ mode: request.mode, prompt: request.prompt, context });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stream.fail(message);
    return { sessionId };
  }

  const args = [...recipe.args, ...(recipe.promptViaStdin ? [] : [prompt])];
  for (const token of [recipe.command, ...args]) {
    assertSafeToken(token);
  }

  let child: ChildProcess;
  try {
    child = spawn(recipe.command, args, {
      cwd: root ?? process.cwd(),
      env: { ...process.env, ...env, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: [recipe.promptViaStdin ? "pipe" : "ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stream.fail(message, "ENOENT");
    return { sessionId };
  }

  const reader = readline.createInterface({ input: child.stdout! });
  const session: Session = {
    id: sessionId,
    child,
    stream,
    reader,
    timer: setTimeout(() => {}, 0),
    stderr: "",
    bytes: 0,
    exited: false,
    terminated: false,
  };
  sessions.set(sessionId, session);
  armIdleTimer(session);

  if (recipe.promptViaStdin) {
    child.stdin?.end(prompt);
  }

  reader.on("line", (line) => {
    if (session.exited) {
      return;
    }
    armIdleTimer(session);
    session.bytes += Buffer.byteLength(line, "utf8");
    if (session.bytes > MAX_OUTPUT_BYTES) {
      finishWithError(session, "La respuesta del agente superó el tamaño máximo.");
      return;
    }
    stream.pushLine(line);
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    if (session.stderr.length < 8000) {
      session.stderr += chunk.toString("utf8");
    }
  });

  child.on("error", (err) => {
    finishWithError(session, err.message || "No se pudo iniciar el agente.", "ENOENT");
  });

  child.on("close", (code) => {
    if (session.exited) {
      return;
    }
    session.exited = true;
    stream.exit(code, session.stderr);
    dispose(session);
  });

  return { sessionId };
}

export function abortChat(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  terminate(session);
  dispose(session);
}

export function abortAllChats(): void {
  for (const session of [...sessions.values()]) {
    terminate(session);
    dispose(session);
  }
}

async function resolveAgent(
  root: string | null,
  requested?: string,
): Promise<{ recipe: AgentRecipe; env: Record<string, string> }> {
  const file = root ? await readSlashmd(root) : {};
  const configured = file.mcp?.agent;
  const env = configured?.env ?? {};
  const name = requested?.trim() || configured?.name;
  if (name) {
    const preset = findAgentPreset(name);
    const sameAsConfigured = Boolean(configured) && configured!.name.toLowerCase() === name.toLowerCase();
    if (preset) {
      return {
        recipe: {
          ...preset,
          args: [...preset.args, ...(sameAsConfigured ? configured?.args ?? [] : [])],
        },
        env: sameAsConfigured ? env : {},
      };
    }
    if (sameAsConfigured) {
      return {
        recipe: { name, label: name, command: name, args: configured?.args ?? [] },
        env,
      };
    }
    return { recipe: { name, label: name, command: name, args: [] }, env: {} };
  }
  for (const preset of AGENT_PRESETS) {
    if (await isCommandAvailable(preset.command)) {
      return { recipe: preset, env: {} };
    }
  }
  return { recipe: AGENT_PRESETS[0], env: {} };
}

async function composeContext(request: ChatRequest): Promise<ChatContextBundle> {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta de docs antes de chatear.");
  }
  const config = await getContentConfig(root);
  const contentPath = config?.contentPath ?? "";
  const branch = (await isGitWorkspace(root)) ? await currentBranchName(root) : undefined;
  const bundle: ChatContextBundle = {
    workspace: { contentPath, mode: config?.mode ?? "local", branch: branch ?? null },
  };

  if (request.scope === ChatScope.Page && request.path) {
    try {
      const buffer = request.bufferMarkdown?.trim();
      const markdown = buffer ? request.bufferMarkdown! : (await loadPage(request.path)).markdown;
      const { raw, body } = splitFrontmatter(markdown);
      bundle.page = {
        path: request.path,
        frontmatter: raw,
        body,
        siblings: await pageSiblings(root, request.path),
      };
    } catch {
      // Missing page: send the request without page context rather than failing.
    }
  }

  const slashmd = await readSlashmd(root);
  bundle.tree = {
    sections: configuredSections(slashmd, config?.contentPath ?? "."),
    pages: await buildSearchIndex(root, contentPath),
  };
  bundle.git = await gitContext(root, branch);

  if (request.references?.length) {
    const references = [];
    for (const refPath of request.references.slice(0, CONTEXT_LIMITS.referenceFiles)) {
      try {
        const page = await loadPage(refPath);
        const { body } = splitFrontmatter(page.markdown);
        references.push({
          path: refPath,
          title: page.frontmatter.title?.trim() || path.basename(refPath),
          markdown: body,
        });
      } catch {
        // Missing reference: drop it rather than failing the whole turn.
      }
    }
    bundle.references = references;
  }

  const lote = await loteContext(root);
  if (lote) {
    bundle.lote = lote;
  }
  return bundle;
}

async function pageSiblings(root: string, pagePath: string): Promise<string[]> {
  try {
    const dir = path.dirname(pagePath);
    const absolute = dir === "." ? root : path.join(root, dir);
    const entries = await fs.readdir(absolute, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => (dir === "." ? entry.name : `${dir}/${entry.name}`))
      .filter((entry) => entry !== pagePath)
      .sort()
      .slice(0, CONTEXT_LIMITS.pageSiblings);
  } catch {
    return [];
  }
}

async function gitContext(
  root: string,
  branch: string | undefined,
): Promise<NonNullable<ChatContextBundle["git"]>> {
  try {
    const statusOut = await runGit(["status", "--porcelain"], { cwd: root });
    const status = statusOut.split("\n").filter(Boolean).slice(0, CONTEXT_LIMITS.gitPaths);
    let diffStat: string[] = [];
    try {
      const numstat = await runGit(["diff", "--numstat", "HEAD"], { cwd: root });
      diffStat = numstat
        .split("\n")
        .filter(Boolean)
        .slice(0, CONTEXT_LIMITS.gitPaths)
        .map((line) => {
          const [added, deleted, file] = line.split("\t");
          return `${file} +${added} -${deleted}`;
        });
    } catch {
      diffStat = [];
    }
    return { branch: branch ?? null, status, diffStat };
  } catch {
    return { branch: branch ?? null, status: [] };
  }
}

async function loteContext(root: string): Promise<ChatContextBundle["lote"]> {
  try {
    const { publication } = await getPublicationState();
    if (!publication?.prNumber) {
      return undefined;
    }
    return {
      prNumber: publication.prNumber,
      title: publication.title,
      branch: publication.branch,
      paths: readStaging(root).slice(0, CONTEXT_LIMITS.lotePaths),
    };
  } catch {
    return undefined;
  }
}

async function isCommandAvailable(command: string): Promise<boolean> {
  const trimmed = command.trim();
  if (!trimmed) {
    return false;
  }
  const candidates = trimmed.includes("/")
    ? [trimmed]
    : (process.env.PATH ?? "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, trimmed));
  for (const candidate of candidates) {
    try {
      await fs.access(candidate, constants.X_OK);
      return true;
    } catch {
      // keep looking
    }
  }
  return false;
}

function assertSafeToken(value: string): void {
  if (!value || value.includes("\0")) {
    throw new Error('Configuración de agente inválida en ".slashmd.json".');
  }
}

function armIdleTimer(session: Session): void {
  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    finishWithError(session, "El agente dejó de responder (sin salida por 60s).");
  }, IDLE_TIMEOUT_MS);
}

function finishWithError(session: Session, message: string, code?: string): void {
  if (session.exited) {
    return;
  }
  session.exited = true;
  session.stream.fail(message, code);
  terminate(session);
  dispose(session);
}

function terminate(session: Session): void {
  if (session.terminated) {
    return;
  }
  session.terminated = true;
  const { child } = session;
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, "SIGTERM");
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    child.kill("SIGTERM");
  }
  const killTimer = setTimeout(() => {
    try {
      if (process.platform !== "win32" && child.pid) {
        process.kill(-child.pid, "SIGKILL");
      } else {
        child.kill("SIGKILL");
      }
    } catch {
      // already gone
    }
  }, 3000);
  killTimer.unref?.();
}

function dispose(session: Session): void {
  clearTimeout(session.timer);
  try {
    session.reader.close();
  } catch {
    // already closed
  }
  sessions.delete(session.id);
}
