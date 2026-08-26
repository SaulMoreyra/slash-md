export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) {
    return text;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  const needle = query.toLowerCase();
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle ? (
          <mark key={index} className="bg-transparent font-semibold text-foreground">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
