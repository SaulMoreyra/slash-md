import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderWithProviders } from "../../../../test/render";
import { PAGE_WIDTH_STORAGE_KEY, PAGE_WIDTH_MIN, PAGE_WIDTH_DEFAULT } from "../../components/PageResizer/utils";
import { usePageWidth, type PageWidthApi } from "../usePageWidth";

let roCallback: ResizeObserverCallback | null = null;

class MockResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    roCallback = callback;
  }
  observe(_target: Element): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function Host({ apiRef }: { apiRef: { current: PageWidthApi | null } }) {
  const api = usePageWidth();
  apiRef.current = api;
  return <div ref={api.containerRef} data-testid="host" />;
}

function renderHost() {
  const apiRef: { current: PageWidthApi | null } = { current: null };
  const { container } = renderWithProviders(<Host apiRef={apiRef} />);
  const host = container.querySelector("[data-testid=host]") as HTMLDivElement;
  return { host, api: () => apiRef.current as PageWidthApi };
}

function measure() {
  act(() => roCallback?.([], {} as ResizeObserver));
}

describe("usePageWidth", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    roCallback = null;
  });

  it("starts from the stored width or the default", () => {
    const { api, host } = renderHost();
    Object.defineProperty(host, "clientWidth", { value: 1200, configurable: true });
    measure();
    expect(api().width).toBe(PAGE_WIDTH_DEFAULT);

    act(() => window.localStorage.setItem(PAGE_WIDTH_STORAGE_KEY, "1000"));
    const again = renderHost();
    expect(again.api().width).toBe(1000);
  });

  it("measures the container and clamps commits to it", () => {
    const { api, host } = renderHost();
    Object.defineProperty(host, "clientWidth", { value: 1200, configurable: true });
    measure();
    expect(api().maxWidth).toBe(1152);
    expect(api().hasRoom).toBe(true);

    act(() => api().onCommit(1400));
    expect(api().width).toBe(1152);
    expect(window.localStorage.getItem(PAGE_WIDTH_STORAGE_KEY)).toBe("1152");
  });

  it("clamps to the minimum width on a small container", () => {
    const { api, host } = renderHost();
    Object.defineProperty(host, "clientWidth", { value: 200, configurable: true });
    measure();
    expect(api().maxWidth).toBe(PAGE_WIDTH_MIN);

    act(() => api().onCommit(500));
    expect(api().width).toBe(PAGE_WIDTH_MIN);
    expect(api().hasRoom).toBe(true);
  });

  it("reports no room when the page is wider than the container", () => {
    act(() => window.localStorage.setItem(PAGE_WIDTH_STORAGE_KEY, "1200"));
    const { api, host } = renderHost();
    Object.defineProperty(host, "clientWidth", { value: 700, configurable: true });
    measure();
    expect(api().maxWidth).toBe(652);
    expect(api().hasRoom).toBe(false);
  });

  it("resets to the default width and persists it", () => {
    const { api, host } = renderHost();
    Object.defineProperty(host, "clientWidth", { value: 1200, configurable: true });
    measure();
    act(() => api().onCommit(1000));
    act(() => api().onReset());
    expect(api().width).toBe(PAGE_WIDTH_DEFAULT);
    expect(window.localStorage.getItem(PAGE_WIDTH_STORAGE_KEY)).toBe(String(PAGE_WIDTH_DEFAULT));
  });
});