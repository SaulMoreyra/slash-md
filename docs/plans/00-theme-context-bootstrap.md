# Plan 00 — ThemeProvider + bootstrap sin flash

> **Auditado.** Ver [AUDIT-2026-08.md](./AUDIT-2026-08.md) para el detalle de hallazgos aplicados.

## Objetivo

Eliminar el **flash de tema incorrecto** al abrir la app (OS en dark, usuario en light → pantalla oscura que luego cambia a claro). Centralizar la lógica de tema en un **React context** que cargue la preferencia desde el inicio, persistida en el **main process** (con migración one-time desde `localStorage`).

**Decisiones acordadas:**

| Tema | Decisión |
|------|----------|
| Estrategia | Script sync pre-paint en `index.html` + `ThemeProvider` React |
| Storage | **JSON propio en `app.getPath("userData")`** — sin dependencia nueva |
| Migración | One-time desde `localStorage["slashmd-theme"]` |
| Modos | Solo `light` / `dark`; OS solo si no hay preferencia guardada |
| Chrome nativo | `BrowserWindow.backgroundColor` y title bar siguen el tema del **usuario** |

---

## Diagnóstico verificado

| # | Problema | Evidencia en código |
|---|----------|---------------------|
| 1 | Primer paint siempre oscuro | `index.html` línea 2: `<html lang="es" class="dark" data-theme="dark">` |
| 2 | Tema aplicado tarde | `useWorkspace.ts` línea 22: `applyTheme(resolveTheme(ws.theme))` dentro de `onRefresh`, tras IPC async |
| 3 | **CSS oscuro por defecto** | `styles.css` línea 101: `body, body.vscode-dark, … { color-scheme: dark; --slash-bg: #18181b; … }` — un `body` sin clase es oscuro |
| 4 | Fallback sesgado a dark | `theme.ts` línea 29: `return getStoredTheme() ?? "dark"` |
| 5 | Chrome nativo ignora al usuario | `main.ts` líneas 38-48: `nativeTheme.shouldUseDarkColors` |
| 6 | Sin context React | `theme.ts` es módulo imperativo + `subscribeTheme` ad hoc |

**Punto crítico (hallazgo de auditoría):** el problema 3 es tan importante como el 1. Aunque pongamos `class="light"` en `<html>`, los tokens del editor Milkdown siguen oscuros hasta que algo añada `body.vscode-light`. **Arreglar `styles.css` no es opcional.**

---

## Implementación

### Fase A — Persistencia en main (sin dependencias)

**Archivo nuevo:** `apps/desktop/electron/themeStore.ts`

```ts
// Lee/escribe { theme: "light" | "dark" } en
// path.join(app.getPath("userData"), "preferences.json")
//
// getTheme(): AppTheme | null      — null si no hay preferencia
// setTheme(theme: AppTheme): void  — write atómico (tmp + rename)
// migrateLegacy(value: string | null): boolean — solo escribe si el store está vacío
```

- Usar `node:fs` sync (el archivo es diminuto; se lee una vez al arranque).
- Envolver todo en try/catch: un `preferences.json` corrupto no debe impedir arrancar.
- Cachear en memoria tras la primera lectura (el `sendSync` del preload debe ser barato).

**Archivo:** `apps/desktop/electron/ipc.ts`

| Canal | Tipo | Uso |
|-------|------|-----|
| `theme:getSync` | `ipcMain.on` + `event.returnValue` | Lectura síncrona para el preload |
| `theme:set` | `ipcMain.handle` | El renderer persiste al cambiar el toggle |
| `theme:migrate` | `ipcMain.handle` | El renderer envía el valor legacy de `localStorage` una vez |

`theme:set` además notifica a `main.ts` para actualizar el chrome de la ventana (Fase D).

### Fase B — Bootstrap pre-paint

**Archivo:** `apps/desktop/electron/preload.ts`

El preload se compila a **CJS** (`vite.config.ts`: `formats: ["cjs"]`) y corre con `contextIsolation: true`. Por eso **no** basta asignar `window.__SLASHMD_INITIAL_THEME__`; hay que exponerlo por el bridge:

```ts
const initialTheme = ipcRenderer.sendSync("theme:getSync") as "light" | "dark" | null;
contextBridge.exposeInMainWorld("__SLASHMD_INITIAL_THEME__", initialTheme);
```

Añadir a `api`: `setTheme`, `migrateTheme` (ambos `invoke`).

**Archivo:** `apps/desktop/index.html`

1. Quitar `class="dark" data-theme="dark"` del `<html>`.
2. Añadir script inline como **primer hijo de `<head>`**, antes de cualquier CSS.

CSP verificada: `script-src 'self' 'unsafe-inline'` ya permite inline scripts.

```html
<script>
(function () {
  try {
    var t = window.__SLASHMD_INITIAL_THEME__;
    if (!t) {
      var s = localStorage.getItem('slashmd-theme');
      if (s === 'light' || s === 'dark') t = s;
    }
    if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    var r = document.documentElement;
    r.classList.add(t);
    r.dataset.theme = t;
  } catch (e) {}
})();
</script>
```

**Nota de auditoría:** el script vive en `<head>`, donde `document.body` **todavía no existe**. Por eso solo toca `<html>`. Escuchar `DOMContentLoaded` para poner la clase en `<body>` reabriría el gap que queremos cerrar.

**Archivo:** `apps/desktop/src/styles.css` — **cambio obligatorio**

Reescribir los selectores de tokens del editor para que dependan de `<html>`, no de `<body>`:

| Antes | Después |
|-------|---------|
| `body, body.vscode-dark, body.vscode-high-contrast` | `html.dark body, body.vscode-dark, body.vscode-high-contrast` |
| `body.vscode-light, body.vscode-high-contrast-light` | `html.light body, body.vscode-light, body.vscode-high-contrast-light` |

Se conservan las clases `vscode-*` porque `packages/ui` y Milkdown las usan; solo dejan de ser la **única** vía. `applyTheme()` sigue poniéndolas para compatibilidad.

### Fase C — ThemeProvider React

**Archivo nuevo:** `apps/desktop/src/theme/ThemeProvider.tsx`

```ts
type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  source: "user" | "os";   // si el usuario ya eligió, ignoramos cambios del OS
};
```

- Estado inicial: `getThemeSnapshot()` — ya correcto porque el bootstrap escribió `dataset.theme`. **Sin efecto async, sin flash.**
- `setTheme` → `applyTheme()` + `api().setTheme(theme)` (persistencia en main).
- Migración al montar: si `localStorage["slashmd-theme"]` existe → `api().migrateTheme(valor)` y limpiar `localStorage`.

**Archivo:** `apps/desktop/src/theme/theme.ts`

- `applyTheme`, `getThemeSnapshot`, `getStoredTheme`, `resolveTheme` siguen siendo puros (los usan bootstrap y tests).
- `setTheme` deja de escribir en `localStorage`; esa responsabilidad pasa al provider vía IPC.
- `subscribeTheme` / `notify` pueden retirarse cuando `ThemeSelector` consuma el context.

**Archivo:** `apps/desktop/src/main.tsx`

```tsx
<ThemeProvider>
  <LocaleProvider>
    <App />
  </LocaleProvider>
</ThemeProvider>
```

**Archivo:** `apps/desktop/src/theme/ThemeSelector.tsx`

- Consumir `use(ThemeContext)` en vez de `subscribeTheme` + estado local.
- Usado en `WelcomeScreen.tsx` y `AccountMenu.tsx` — ambos quedan dentro del provider.

**Archivo:** `apps/desktop/src/App/hooks/useWorkspace.ts`

- Quitar `applyTheme(resolveTheme(ws.theme))` de `onRefresh` (líneas 20-22).
- Conservar el listener `onTheme` **solo** como fallback cuando no hay preferencia de usuario (la guarda `if (getStoredTheme()) return` pasa a consultar el provider).
- **`WorkspaceInfo.theme` se queda en `shared/api.ts`**: varios specs lo mockean (`useNav.spec.ts` línea 23) y sigue siendo el fallback del OS.

### Fase D — Chrome nativo Electron

**Archivo:** `apps/desktop/electron/main.ts`

- Helper `themeColors(theme)` → `{ background, symbol }` con los valores ya presentes: dark `#000000` / `#ececec`, light `#f4f4f5` / `#18181b`.
- En `createWindow()`: `themeStore.getTheme() ?? (nativeTheme.shouldUseDarkColors ? "dark" : "light")`.
- Al recibir `theme:set`: actualizar `backgroundColor` y, en no-macOS, `setTitleBarOverlay()`.

---

## Testing

### Specs

| Archivo | Casos |
|---------|-------|
| Nuevo: `src/theme/__specs__/theme.spec.ts` | `applyTheme` alterna clases en `html` y `body`; `resolveTheme` prioriza usuario sobre OS; `getThemeSnapshot` lee del DOM |
| Nuevo: `src/theme/__specs__/ThemeProvider.spec.tsx` | Provider expone el tema del DOM sin efecto async; `setTheme` llama al IPC mockeado; migración corre una sola vez |
| Actualizar: `src/App/__specs__/App.spec.tsx` | Envolver en `ThemeProvider` si hace falta |

Los specs usan `renderWithProviders` de `src/test/render.tsx` (hoy solo envuelve `LocaleProvider`; añadir `ThemeProvider` ahí).

### Comandos

```bash
npm run test -- --run apps/desktop/src/theme
npm run desktop:typecheck
npm run desktop:lint
```

---

## Validación manual

Precondición: OS en **dark mode**, app configurada en **light**.

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Cerrar la app por completo y reabrir | **Sin flash oscuro** — primer paint en light |
| 2 | Grabar la ventana en cámara lenta o vídeo | Ni un frame oscuro antes del contenido |
| 3 | Resetear preferencia con OS dark | Carga dark consistente, sin flash claro |
| 4 | Resetear preferencia con OS light | Carga light consistente |
| 5 | Toggle light ↔ dark en AccountMenu y Welcome | Cambio instantáneo en chrome **y** en el editor Milkdown |
| 6 | Cerrar y reabrir | Preferencia persistida en `preferences.json` (no en localStorage) |
| 7 | Usuario con `localStorage slashmd-theme=light` previo | Primer arranque migra al store y limpia localStorage |
| 8 | Ventana nativa (traffic lights macOS / title bar Win) | Fondo coherente con light cuando el usuario eligió light |
| 9 | Abrir un workspace (IPC async) | El tema **no** parpadea al cargar el árbol |
| 10 | Editor Milkdown en ambos temas | Tokens correctos; sin zonas oscuras en modo light |
| 11 | Borrar/corromper `preferences.json` a mano | La app arranca igual, cae al tema del OS |

**Regresión:** Welcome, modales, rail y HeroUI se ven correctos en ambos temas.

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `sendSync` bloquea el arranque del renderer | El store cachea en memoria; lectura de un JSON de bytes |
| Dev server sin Electron (`vite` suelto) | El script inline cae a `localStorage` + `matchMedia` |
| Selectores CSS `html.dark body` rompen algo | Se conservan las clases `vscode-*` en paralelo |
| `preferences.json` corrupto | try/catch → fallback al OS |

---

## Fuera de scope

- Modo System / Light / Dark (toggle de tres estados)
- Tema por workspace o en `.slashmd.json`
- Temas personalizados más allá de light/dark
