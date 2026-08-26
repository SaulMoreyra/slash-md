/** Split / align markdown for human conflict compare (not a git hunk model). */

export type BlockSide = "ours" | "theirs";

export type AlignedSlot =
  | { type: "equal"; text: string }
  | { type: "change"; ours: string | null; theirs: string | null };

/** Split markdown into paragraph-ish blocks; fenced code stays one block. */
export function splitMarkdownBlocks(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const blocks: string[] = [];
  const lines = normalized.split("\n");
  let buffer: string[] = [];
  let inFence = false;

  function flush() {
    const text = buffer.join("\n").trim();
    if (text) {
      blocks.push(text);
    }
    buffer = [];
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inFence) {
        flush();
        inFence = true;
        buffer.push(line);
        continue;
      }
      buffer.push(line);
      inFence = false;
      flush();
      continue;
    }
    if (inFence) {
      buffer.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}

/** LCS-align block lists into equal + change slots. */
export function alignMarkdownBlocks(
  oursMarkdown: string | null,
  theirsMarkdown: string | null,
): AlignedSlot[] {
  const ours = splitMarkdownBlocks(oursMarkdown ?? "");
  const theirs = splitMarkdownBlocks(theirsMarkdown ?? "");

  if (ours.length === 0 && theirs.length === 0) {
    return [];
  }
  if (ours.length === 0) {
    return theirs.map((text) => ({ type: "change" as const, ours: null, theirs: text }));
  }
  if (theirs.length === 0) {
    return ours.map((text) => ({ type: "change" as const, ours: text, theirs: null }));
  }

  const n = ours.length;
  const m = theirs.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (ours[i] === theirs[j]) {
        dp[i]![j] = (dp[i + 1]![j + 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
      }
    }
  }

  const slots: AlignedSlot[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ours[i] === theirs[j]) {
      slots.push({ type: "equal", text: ours[i]! });
      i++;
      j++;
      continue;
    }
    if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      slots.push({ type: "change", ours: ours[i]!, theirs: null });
      i++;
    } else {
      slots.push({ type: "change", ours: null, theirs: theirs[j]! });
      j++;
    }
  }
  while (i < n) {
    slots.push({ type: "change", ours: ours[i]!, theirs: null });
    i++;
  }
  while (j < m) {
    slots.push({ type: "change", ours: null, theirs: theirs[j]! });
    j++;
  }

  return coalesceAdjacentChanges(slots);
}

/** Merge consecutive one-sided changes into a single change when possible. */
function coalesceAdjacentChanges(slots: AlignedSlot[]): AlignedSlot[] {
  const out: AlignedSlot[] = [];
  for (const slot of slots) {
    const prev = out[out.length - 1];
    if (
      slot.type === "change" &&
      prev?.type === "change" &&
      prev.ours != null &&
      prev.theirs == null &&
      slot.ours == null &&
      slot.theirs != null
    ) {
      out[out.length - 1] = { type: "change", ours: prev.ours, theirs: slot.theirs };
      continue;
    }
    if (
      slot.type === "change" &&
      prev?.type === "change" &&
      prev.ours == null &&
      prev.theirs != null &&
      slot.ours != null &&
      slot.theirs == null
    ) {
      out[out.length - 1] = { type: "change", ours: slot.ours, theirs: prev.theirs };
      continue;
    }
    out.push(slot);
  }
  return out;
}

export function changeSlotIndexes(slots: AlignedSlot[]): number[] {
  return slots.flatMap((slot, index) => (slot.type === "change" ? [index] : []));
}

function choiceAt(
  choices: ReadonlyMap<number, BlockSide> | Record<number, BlockSide>,
  index: number,
): BlockSide | undefined {
  if (choices instanceof Map) {
    return choices.get(index);
  }
  return (choices as Record<number, BlockSide | undefined>)[index];
}

export function allDiffsChosen(
  slots: AlignedSlot[],
  choices: ReadonlyMap<number, BlockSide> | Record<number, BlockSide>,
): boolean {
  return changeSlotIndexes(slots).every((index) => choiceAt(choices, index) != null);
}

/** Build full markdown from aligned slots + per-change choices. Missing choices use ours when present. */
export function reconstructMarkdown(
  slots: AlignedSlot[],
  choices: ReadonlyMap<number, BlockSide> | Record<number, BlockSide>,
): string {
  const parts: string[] = [];
  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index]!;
    if (slot.type === "equal") {
      parts.push(slot.text);
      continue;
    }
    const side = choiceAt(choices, index) ?? (slot.ours != null ? "ours" : "theirs");
    const text = side === "ours" ? slot.ours : slot.theirs;
    if (text) {
      parts.push(text);
    }
  }
  return parts.join("\n\n");
}

/** Apply one block choice; returns updated choice map. */
export function applyBlockChoice(
  choices: ReadonlyMap<number, BlockSide>,
  index: number,
  side: BlockSide,
): Map<number, BlockSide> {
  const next = new Map(choices);
  next.set(index, side);
  return next;
}
