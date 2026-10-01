import { useMemo } from "react";
import { parseInline, parseMarkdown, type MdBlock, type MdInline } from "./markdown";

type Props = {
  text: string;
  className?: string;
  onOpenLink?: (href: string) => void;
};

export function MarkdownText({ text, className, onOpenLink }: Props) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  if (!text.trim()) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} onOpenLink={onOpenLink} />
      ))}
    </div>
  );
}

function Block({ block, onOpenLink }: { block: MdBlock; onOpenLink?: (href: string) => void }) {
  switch (block.kind) {
    case "heading":
      return (
        <p className={block.level <= 2 ? "text-base font-semibold" : "text-sm font-semibold"}>
          <Inline text={block.text} onOpenLink={onOpenLink} />
        </p>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg bg-default/40 p-2 font-mono text-[0.8em] leading-relaxed">
          <code>{block.code}</code>
        </pre>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`flex flex-col gap-0.5 pl-4 ${block.ordered ? "list-decimal" : "list-disc"}`}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline text={item} onOpenLink={onOpenLink} />
            </li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-2 border-separator pl-2 text-muted">
          <Inline text={block.text} onOpenLink={onOpenLink} />
        </blockquote>
      );
    case "hr":
      return <hr className="border-separator" />;
    default:
      return (
        <p className="whitespace-pre-wrap">
          <Inline text={block.text} onOpenLink={onOpenLink} />
        </p>
      );
  }
}

function Inline({ text, onOpenLink }: { text: string; onOpenLink?: (href: string) => void }) {
  const nodes = useMemo(() => parseInline(text), [text]);
  return (
    <>
      {nodes.map((node, index) => (
        <InlineNode key={index} node={node} onOpenLink={onOpenLink} />
      ))}
    </>
  );
}

function InlineNode({ node, onOpenLink }: { node: MdInline; onOpenLink?: (href: string) => void }) {
  switch (node.kind) {
    case "code":
      return (
        <code className="rounded bg-default/50 px-1 py-0.5 font-mono text-[0.85em]">
          {node.value}
        </code>
      );
    case "bold":
      return <strong className="font-semibold">{node.value}</strong>;
    case "italic":
      return <em>{node.value}</em>;
    case "link":
      return (
        <button
          type="button"
          className="text-accent underline underline-offset-2"
          onClick={() => onOpenLink?.(node.href)}
        >
          {node.value}
        </button>
      );
    default:
      return <>{node.value}</>;
  }
}
