import { parseAgentLine } from "./adapters";
import { ChatMode, type ChatHostEvent } from "./types";

/** Aggregated state while consuming one agent turn. */
export type ChatStreamState = {
  /** All assistant prose received so far. */
  text: string;
  /** Last editable-markdown snapshot derived from `text` (edit mode only). */
  edit: string;
  /** True once any token-level delta arrived (guards non-streaming fallbacks). */
  sawTextDelta: boolean;
  ended: boolean;
};

export function initialStreamState(): ChatStreamState {
  return { text: "", edit: "", sawTextDelta: false, ended: false };
}

/**
 * Pull the markdown to write into the page out of an agent response. Handles
 * both a fenced ```markdown block (preferred, explicit) and raw markdown, and
 * works while the fence is still open mid-stream.
 */
export function extractEditableMarkdown(text: string): string {
  const fenced = text.match(/```[ \t]*[a-zA-Z]*[ \t]*\n([\s\S]*?)```/);
  if (fenced) {
    return trimTrailing(fenced[1]);
  }
  const openFence = text.match(/^\s*```[ \t]*[a-zA-Z]*[ \t]*\n([\s\S]*)$/);
  if (openFence) {
    return trimTrailing(openFence[1]);
  }
  return trimTrailing(text);
}

export function reduceAgentLine(
  agent: string,
  mode: ChatMode,
  state: ChatStreamState,
  raw: string,
): { state: ChatStreamState; events: ChatHostEvent[] } {
  const events: ChatHostEvent[] = [];
  let next = state;
  for (const event of parseAgentLine(agent, raw)) {
    switch (event.kind) {
      case "delta": {
        const isText = event.channel === "text";
        next = {
          ...next,
          text: isText ? next.text + event.text : next.text,
          sawTextDelta: next.sawTextDelta || isText,
        };
        events.push(isText ? { type: "delta", text: event.text } : { type: "thinking", text: event.text });
        break;
      }
      case "fullText": {
        if (next.sawTextDelta) {
          break;
        }
        // Non-streaming agents send complete parts; replace when the part is a
        // superset of what we have, otherwise append (multi-part responses).
        const merged = mergeFullText(next.text, event.text);
        if (merged !== next.text) {
          events.push({ type: "delta", text: merged.slice(next.text.length) });
        }
        next = { ...next, text: merged };
        break;
      }
      case "tool": {
        events.push({ type: "tool", name: event.name, brief: event.brief });
        break;
      }
      case "done": {
        if (!next.ended) {
          next = { ...next, ended: true };
          events.push({ type: "done", code: 0 });
        }
        break;
      }
      case "error": {
        if (!next.ended) {
          next = { ...next, ended: true };
          events.push({ type: "error", message: event.message });
        }
        break;
      }
    }
  }
  if (mode === ChatMode.EditPage) {
    const edit = extractEditableMarkdown(next.text);
    if (edit !== next.edit) {
      next = { ...next, edit };
      events.push({ type: "editStream", markdown: edit });
    }
  }
  return { state: next, events };
}

export function reduceAgentExit(
  mode: ChatMode,
  state: ChatStreamState,
  code: number | null,
  stderr = "",
): { state: ChatStreamState; events: ChatHostEvent[] } {
  const events: ChatHostEvent[] = [];
  let next = state;
  if (next.ended) {
    return { state: next, events };
  }
  next = { ...next, ended: true };
  const hasText = next.text.trim().length > 0;
  if (code === 0 || hasText) {
    events.push({ type: "done", code });
  } else {
    events.push({
      type: "error",
      message: stderr.trim() || `Agent exited with code ${code ?? "null"}`,
      code: code === null ? undefined : String(code),
    });
  }
  if (mode === ChatMode.EditPage && next.edit !== state.edit) {
    events.push({ type: "editStream", markdown: next.edit });
  }
  return { state: next, events };
}

/**
 * Stateful wrapper that feeds NDJSON lines through the reducer and throttles
 * `editStream` snapshots so ProseMirror re-parses at most ~10/s.
 */
export class ChatStream {
  private state: ChatStreamState = initialStreamState();
  private lastEdit = "";
  private lastEditAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly agent: string,
    private readonly mode: ChatMode,
    private readonly sink: (event: ChatHostEvent) => void,
    private readonly editIntervalMs = 100,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  pushLine(raw: string): void {
    const { state, events } = reduceAgentLine(this.agent, this.mode, this.state, raw);
    this.state = state;
    this.emit(events);
  }

  exit(code: number | null, stderr = ""): void {
    const { state, events } = reduceAgentExit(this.mode, this.state, code, stderr);
    this.state = state;
    this.emit(events);
    this.flushEdit();
  }

  fail(message: string, code?: string): void {
    this.state = { ...this.state, ended: true };
    this.sink({ type: "error", message, code });
  }

  get snapshot(): ChatStreamState {
    return this.state;
  }

  private emit(events: ChatHostEvent[]): void {
    const now = this.clock();
    for (const event of events) {
      if (event.type === "editStream") {
        if (now - this.lastEditAt < this.editIntervalMs) {
          continue;
        }
        this.lastEditAt = now;
        this.lastEdit = event.markdown;
        this.sink(event);
        continue;
      }
      this.sink(event);
    }
  }

  private flushEdit(): void {
    if (this.mode !== ChatMode.EditPage || this.state.edit === this.lastEdit) {
      return;
    }
    this.lastEdit = this.state.edit;
    this.sink({ type: "editStream", markdown: this.state.edit });
  }
}

function mergeFullText(current: string, incoming: string): string {
  if (!current) {
    return incoming;
  }
  if (incoming.startsWith(current)) {
    return incoming;
  }
  if (current.startsWith(incoming)) {
    return current;
  }
  return current + incoming;
}

function trimTrailing(value: string): string {
  return value.replace(/\n+$/, "\n");
}
