import { useCallback, useEffect, useMemo, useState } from "react";
import { flattenLibrary } from "@slash-md/ui/home/utils/tree";
import type { HomeTreePayload, PagePayload, WorkspaceInfo } from "../shared/api";
import { EditorScreen } from "./screens/Editor";
import { EditorBlank, HomeScreen } from "./screens/Home";
import { WelcomeScreen } from "./screens/Welcome";

const api = () => window.slashmd;

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tree, setTree] = useState<HomeTreePayload | null>(null);
  const [page, setPage] = useState<PagePayload | null>(null);
  const [focusThreadId, setFocusThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyTheme = useCallback((theme: "light" | "dark") => {
    document.body.classList.toggle("vscode-dark", theme === "dark");
    document.body.classList.toggle("vscode-light", theme === "light");
  }, []);

  const refresh = useCallback(async () => {
    const ws = await api().getWorkspace();
    setWorkspace(ws);
    applyTheme(ws.theme);
    if (ws.root) {
      setTree(await api().homeTree());
    } else {
      setTree(null);
    }
  }, [applyTheme]);

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [refresh]);

  useEffect(() => api().onTheme(applyTheme), [applyTheme]);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const trail = useMemo(() => {
    if (!page || !tree) {
      return "";
    }
    return flattenLibrary(tree.roots).find((hit) => hit.path === page.path)?.trail ?? "";
  }, [page, tree]);

  if (!workspace) {
    return (
      <div className="boot">
        <p>Cargando Slash MD…</p>
        {error ? <p className="error">{error}</p> : null}
      </div>
    );
  }

  if (!workspace.root) {
    return (
      <WelcomeScreen
        busy={busy}
        error={error}
        onOpen={async () => {
          await run(async () => {
            const folder = await api().pickFolder();
            if (!folder) {
              return;
            }
            await api().openFolder(folder);
            await refresh();
          });
        }}
      />
    );
  }

  return (
    <HomeScreen
      workspace={workspace}
      tree={tree}
      pagePath={page?.path ?? null}
      busy={busy}
      error={error}
      onRefresh={refresh}
      onError={setError}
      onOpenPage={async (path, threadId) => {
        await run(async () => {
          setFocusThreadId(threadId ?? null);
          setPage(await api().openPage(path));
        });
      }}
      onChangeFolder={async () => {
        await run(async () => {
          const folder = await api().pickFolder();
          if (!folder) {
            return;
          }
          await api().openFolder(folder);
          setPage(null);
          setFocusThreadId(null);
          await refresh();
        });
      }}
      run={run}
    >
      {page ? (
        <EditorScreen
          page={page}
          busy={busy}
          focusThreadId={focusThreadId}
          trail={trail}
          auth={workspace.auth}
          onError={setError}
          onPage={setPage}
          run={run}
        />
      ) : (
        <EditorBlank />
      )}
    </HomeScreen>
  );
}
