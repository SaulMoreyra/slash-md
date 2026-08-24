export type {
  HomeFromWebview,
  HomeToWebview,
  ReviewPreviewItem,
} from "../domain/homeProtocol";

export function homeHtml(opts: {
  nonce: string;
  cspSource: string;
  jsUri: string;
  cssUri: string;
}): string {
  const { nonce, cspSource, jsUri, cssUri } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Slash MD</title>
  <link rel="stylesheet" href="${cssUri}" />
</head>
<body class="home">
  <aside class="rail" aria-label="Sections">
    <div class="rail-head">
      <p class="rail-repo" id="repo">…</p>
    </div>
    <div class="rail-tools">
      <button type="button" id="refresh" class="rail-link">Actualizar</button>
      <button type="button" id="new-folder" class="rail-link">Nueva carpeta</button>
    </div>
    <div class="rail-search">
      <input type="search" id="search" class="search-input" placeholder="Buscar páginas\u2026" autocomplete="off" />
    </div>
    <nav class="rail-tree" id="tree" aria-label="Folders"></nav>
    <footer class="foot-line">
      <p class="foot-status" id="status"></p>
      <button type="button" id="config-btn" class="rail-link">Configurar</button>
      <button type="button" id="signin" class="rail-link" hidden>Sign in</button>
      <button type="button" id="init" class="rail-link" hidden>Init</button>
    </footer>
  </aside>

  <div class="home-body">
    <header class="nav-edge">
      <span class="wordmark">Slash MD</span>
      <button type="button" id="new" class="cta-fill">Nueva página</button>
    </header>
    <main class="stage" id="stage" aria-live="polite">
      <div class="stage-inner" id="stage-inner"></div>
    </main>
  </div>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}

export function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
