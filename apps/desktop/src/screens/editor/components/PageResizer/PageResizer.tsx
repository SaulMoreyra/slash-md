import { useTranslation } from "react-i18next";
import type { RefObject } from "react";
import { usePageResizeController } from "./hooks/usePageResizeController";
import type { ResizeEdge } from "./utils";

export type PageResizerProps = {
  visible: boolean;
  width: number;
  containerRef: RefObject<HTMLDivElement | null>;
  onCommit: (width: number) => void;
  onReset: () => void;
};

export function PageResizer({ visible, width, containerRef, onCommit, onReset }: PageResizerProps) {
  const { t } = useTranslation();
  const { dragging, getWellProps } = usePageResizeController({
    width,
    containerRef,
    onCommit,
    onReset,
  });

  if (!visible) {
    return null;
  }

  const label = `${t("editor.pageResize.resize")} · ${t("editor.pageResize.reset")}`;
  return (
    <>
      <Well edge="left" dragging={dragging} label={label} props={getWellProps("left")} />
      <Well edge="right" dragging={dragging} label={label} props={getWellProps("right")} />
    </>
  );
}

function Well({
  edge,
  dragging,
  label,
  props,
}: {
  edge: ResizeEdge;
  dragging: ResizeEdge | null;
  label: string;
  props: ReturnType<ReturnType<typeof usePageResizeController>["getWellProps"]>;
}) {
  const active = dragging === edge;
  return (
    <div
      {...props}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      className={`page-resize-well is-${edge}${active ? " is-active" : ""}`}
    />
  );
}