import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
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
  type AgentLoginStatus,
  type AgentProbeResult,
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

type LoginPushMessage =
  | { type: "line"; text: string }
  | { type: "url"; url: string }
  | { type: "done"; ok: boolean }
  | { type: "error"; message: string };

type LoginPush = (message: LoginPushMessage) => void;

/** Unified main-process log line for agent probing/loginning. */
function agentLog(kind: string, ...parts: unknown[]): void {
  const who = kind === "chat" ? "chat" : "login";
  console.log(`[agent][${who}] ${new Date().toISOString()} ${kind}`, ...parts);
}

function truncate(value: string, max = 4000): string {
  return value.length <= max ? value : `${value.slice(0, max)}…[+${value.length - max} chars]`;
}

/** Redact anything that looks like an API key/token/code before logging. */
function redact(value: string): string {
  return value.replace(
    /(sk-[a-zA-Z0-9_-]+|ghp_[a-zA-Z0-9]+|Bearer\s+[a-zA-Z0-9._~+/=-]+|api[-_]?key["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{8,})/gi,
    "[REDACTED]",
  );
}

type LoginSession = {
  child: ChildProcess;
  exited: boolean;
  terminated: boolean;
};

const logins = new Map<string, LoginSession>();

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
      loginCommand: loginCommandForConfig(configured, file.mcp?.agent),
    });
  }
  for (const preset of AGENT_PRESETS) {
    const paste = preset.login?.pasteKey;
    infos.push({
      name: preset.name,
      label: preset.label,
      command: preset.command,
      available: await isCommandAvailable(preset.command),
      loginCommand: preset.login ? [preset.login.command, ...preset.login.args].join(" ") : preset.command,
      loginPasteKey: Boolean(paste),
      loginProviders: paste?.providers,
    });
  }
  return infos;
}

const OPENCODE_CRED_FILE = "~/.local/share/opencode/auth.json";
const PROVIDER_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * Headless alternative to opencode's interactive `providers login`: write the
 * pasted API key straight into auth.json (`{ <provider>: { type: "api", key } }`,
 * the same schema opencode uses) and re-probe.
 */
export async function setAgentApiKey(
  agent: string,
  provider: string,
  key: string,
): Promise<AgentLoginStatus> {
  const preset = findAgentPreset(agent);
  const allowed = preset?.login?.pasteKey?.providers;
  if (!allowed) {
    throw new Error(`El agente "${agent}" no admite pegar una API key.`);
  }
  const entry = allowed.find((p) => p.id === provider);
  if (!entry || !PROVIDER_ID.test(provider)) {
    throw new Error(`Proveedor desconocido para "${agent}": ${provider}`);
  }
  const token = key.trim();
  if (token.length < 8) {
    throw new Error("Pega una API key válida (mín. 8 caracteres).");
  }
  agentLog("apiKey.write", { agent, provider, keyLength: token.length });
  const file = expandHome(OPENCODE_CRED_FILE);
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    let creds: Record<string, { type: string; key?: string }> = {};
    const existing = await fs.readFile(file, "utf8").catch(() => "");
    const parsed = existing.trim() ? JSON.parse(existing) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      creds = parsed;
    }
    creds[provider] = { type: "api", key: token };
    await fs.writeFile(file, `${JSON.stringify(creds, null, 2)}\n`, { mode: 0o600 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    agentLog("apiKey.writeError", { agent, provider, error: message });
    throw new Error(`No se pudo guardar la API key (${message}).`);
  }
  const status = await probeAgentStatus(agent);
  status.detail = `API key guardada (${entry.label})`;
  return status;
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

export async function probeAgentStatus(agent: string): Promise<AgentLoginStatus> {
  const root = getWorkspaceRoot();
  const file = root ? await readSlashmd(root) : {};
  const configured = file.mcp?.agent;
  const name = agent.trim();
  const preset = findAgentPreset(name);
  const sameAsConfigured = Boolean(configured) && configured!.name.toLowerCase() === name.toLowerCase();
  if (!preset && !sameAsConfigured) {
    return { name, available: false, loggedIn: null };
  }
  const recipe: AgentRecipe = preset ?? { name, label: name, command: configured?.name ?? name, args: configured?.args ?? [] };
  const available = await isCommandAvailable(recipe.command);
  agentLog("probe", { agent: recipe.name, command: recipe.command, available, probeKind: recipe.probe?.kind ?? "none" });
  const probe = recipe.probe;
  if (!probe) {
    return { name: recipe.name, available, loggedIn: null };
  }
  if (probe.kind === "file") {
    let seenMissing = 0;
    for (const filePath of probe.paths) {
      try {
        const full = expandHome(filePath);
        const stat = await fs.stat(full);
        if (stat.isFile() && stat.size > 0) {
          agentLog("probe.file", { agent: recipe.name, path: full, size: stat.size, loggedIn: true });
          return { name: recipe.name, available, loggedIn: true };
        }
        seenMissing += 1;
      } catch {
        seenMissing += 1;
      }
    }
    const loggedIn = seenMissing === probe.paths.length ? false : null;
    agentLog("probe.file", { agent: recipe.name, missing: probe.paths.length, loggedIn });
    return { name: recipe.name, available, loggedIn };
  }
  try {
    const result = await runProbeCommand(probe.command, probe.args, root ?? process.cwd());
    const loggedIn = probe.then(result);
    agentLog("probe.command", {
      agent: recipe.name,
      command: probe.command,
      args: probe.args,
      code: result.code,
      stdout: truncate(redact(result.stdout), 800),
      stderr: truncate(redact(result.stderr), 800),
      loggedIn,
    });
    return { name: recipe.name, available, loggedIn };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    agentLog("probe.error", { agent: recipe.name, message });
    return { name: recipe.name, available, loggedIn: null, detail: message };
  }
}

/**
 * Launch an interactive agent sign-in with piped stdio (no TTY). Output lines
 * and any browser URLs are pushed to the renderer; abort via `abortAgentLogin`.
 */
export async function startAgentLogin(agent: string, push: LoginPush): Promise<void> {
  const root = getWorkspaceRoot();
  const { command, args, env, openUrl } = await resolveLoginCommand(root, agent);
  agentLog("login.start", { agent, command, args, openUrl, cwd: root ?? process.cwd() });
  if (!(await isCommandAvailable(command))) {
    const err = `No se encontró "${command}" en PATH. Instálalo antes de iniciar sesión.`;
    agentLog("login.error", { agent, message: err });
    throw new Error(err);
  }
  for (const token of [command, ...args]) {
    assertSafeToken(token);
  }
  const child = spawn(command, args, {
    cwd: root ?? process.cwd(),
    env: { ...process.env, ...env, NO_COLOR: "1", FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  const session: LoginSession = { child, exited: false, terminated: false };
  logins.set(agent, session);
  agentLog("login.spawned", { agent, pid: child.pid });

  let urlSent = !openUrl;
  const forward = (text: string) => {
    push({ type: "line", text });
    agentLog("login.line", { agent, text: truncate(redact(text), 800) });
    if (!urlSent) {
      const url = text.match(/(https?:\/\/[^\s"'<>)\]]+)/)?.[1];
      if (url) {
        urlSent = true;
        push({ type: "url", url });
        agentLog("login.url", { agent, url });
      }
    }
  };

  const reader = readline.createInterface({ input: child.stdout! });
  reader.on("line", (line) => {
    if (!session.exited && line.trim()) {
      forward(line.replace(/\r/g, "") + "\n");
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    if (!session.exited) {
      forward(chunk.toString("utf8"));
    }
  });
  child.on("error", (err) => {
    agentLog("login.spawnError", { agent, message: err.message });
    if (!session.exited) {
      session.exited = true;
      push({ type: "error", message: err.message || "No se pudo iniciar el login del agente." });
    }
  });
  child.on("close", (code) => {
    agentLog("login.close", { agent, pid: child.pid, code, urlSent, terminated: session.terminated });
    if (session.exited) {
      return;
    }
    session.exited = true;
    push({ type: "done", ok: code === 0 });
    logins.delete(agent);
  });
}

export function abortAgentLogin(agent: string): void {
  const session = logins.get(agent);
  if (!session) {
    agentLog("login.abort", { agent, found: false });
    return;
  }
  session.terminated = true;
  agentLog("login.abort", { agent, pid: session.child.pid, found: true });
  terminateLogin(session);
}

function terminateLogin(session: LoginSession): void {
  if (session.exited) {
    return;
  }
  session.exited = true;
  try {
    if (process.platform !== "win32" && session.child.pid) {
      process.kill(-session.child.pid, "SIGTERM");
    } else {
      session.child.kill("SIGTERM");
    }
  } catch {
    session.child.kill("SIGTERM");
  }
  const killTimer = setTimeout(() => {
    try {
      if (process.platform !== "win32" && session.child.pid) {
        process.kill(-session.child.pid, "SIGKILL");
      } else {
        session.child.kill("SIGKILL");
      }
    } catch {
      // already gone
    }
  }, 3000);
  killTimer.unref?.();
}

async function resolveLoginCommand(
  root: string | null,
  requested: string,
): Promise<{ command: string; args: string[]; env: Record<string, string>; openUrl: boolean }> {
  const file = root ? await readSlashmd(root) : {};
  const configured = file.mcp?.agent;
  const name = requested?.trim();
  const preset = name ? findAgentPreset(name) : undefined;
  const sameAsConfigured = Boolean(configured) && name?.toLowerCase() === configured?.name.toLowerCase();
  if (preset?.login) {
    const resolved = {
      command: preset.login.command,
      args: preset.login.args,
      envKeys: preset.login.env ? Object.keys(preset.login.env) : [],
      hasConfiguredEnv: sameAsConfigured ? Boolean(configured?.env) : false,
      openUrl: preset.login.openUrl !== false,
    };
    agentLog("login.resolve", { agent: requested, ...resolved });
    return {
      command: preset.login.command,
      args: preset.login.args,
      env: { ...(preset.login.env ?? {}), ...(sameAsConfigured ? configured?.env ?? {} : {}) },
      openUrl: preset.login.openUrl !== false,
    };
  }
  if (preset) {
    throw new Error(`El agente "${preset.label}" no permite iniciar sesión desde la app.`);
  }
  if (sameAsConfigured) {
    throw new Error(
      'El agente configurado en "mcp.agent" no define un comando de login. Agrega credenciales vía env en .slashmd.json.',
    );
  }
  throw new Error(`Agente desconocido: ${name ?? "(vacío)"}`);
}

async function runProbeCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<AgentProbeResult> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < 32_000) {
        stdout += chunk.toString("utf8");
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < 32_000) {
        stderr += chunk.toString("utf8");
      }
    });
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        resolve({ stdout, stderr, code: null });
      }
    }, 10_000);
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      }
    });
  });
}

function expandHome(value: string): string {
  if (value === "~" || value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function loginCommandForConfig(
  command: string,
  configured: { name: string; args?: string[] } | undefined,
): string {
  const args = configured?.args?.length ? ` ${configured.args.join(" ")}` : "";
  return `${command}${args}`;
}
