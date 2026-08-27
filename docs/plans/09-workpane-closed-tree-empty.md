# Plan 09 — WorkPane cerrado al arrancar + árbol skeleton/empty

> **Hecho.** Al abrir la app, la columna secundaria empieza **cerrada**. El **click** solo abre; **⌘1 / ⌘2 / ⌘3** abren o cierran ese pane. El árbol muestra skeleton al cargar y empty si no hay páginas.
>
> **No depende de** [08-publications-pane-rich.md](./08-publications-pane-rich.md). Sí convive con [06-collapse-workpane-on-folder.md](./06-collapse-workpane-on-folder.md) (carpeta sigue sin WorkPane).

---

## Objetivo

Hoy `workPaneOpen` nace en `true` y el Stage comparte sitio con Borradores aunque nadie lo haya pedido.

1. Arranque → WorkPane **cerrado**. Stage a ancho completo (`EditorBlank` / editor).
2. Inbox, Borradores, Publicaciones → el **click solo abre**. Un segundo click **no** cierra.
3. **⌘1 / ⌘2 / ⌘3** (y ⌘4 si sigue mapeado a Publicaciones) **alternan**: si ese pane ya está abierto, lo cierran; si no, lo abren o cambian de destino.
4. Árbol: skeleton si `payload === null`; empty si ya cargó y `roots.length === 0` (y no es `needsInit`).

Cerrar el pane: **X**, **⌘\\**, **Esc** (sin página), o **el mismo atajo** del destino activo. El click del rail no cierra.

---

## Por qué click ≠ atajo

El click es “quiero ver esto”: deseleccionar la fila no debería esconder la lista. El atajo es un interruptor, como ⌘K en buscar: la misma tecla saca y mete. Si ya estás en Borradores, ⌘1 significa “ya no necesito la lista”.

---

## Decisiones

| Tema | Decisión |
|------|----------|
| Default | `useState(false)` en `useNav` |
| Nav Inbox / Drafts / Publications (click) | `onNavigate` → `setWorkPaneOpen(true)`. **Nunca** toggle |
| Mismo ítem ya seleccionado (click) | No-op de cierre. ListBox controlado: no permitir selección vacía |
| Rail colapsado (click) | Igual: `onNav` abre; no cierra |
| Atajos ⌘1 / ⌘2 / ⌘3 | `onToggleWorkDest`: mismo destino + pane abierto → **cierra**; si no → `onNavigate` (abre / cambia) |
| Carpeta (plan 06) | Sin cambio: `onOpenFolder` cierra el pane; Folder no monta WorkColumn |
| Fallback (carpeta borrada, nav workspace-only inválido) | Sigue yendo a Drafts **y abre** el pane (no dejar al usuario sin lista ni carpeta) |
| Refresh | `homeTree` no pone `tree` en `null` entre refrescos → skeleton **solo** primer load / cerrar workspace |
| `needsInit` | Sin árbol. Hint actual en RailNav. Ni skeleton ni empty |
| Empty del árbol | Compacto (rail ~240px). Sin CTA: el botón **Nueva página** del rail ya cubre el alta |
| Cerrar | X, `⌘\\`, Esc (sin página), o el atajo del pane activo. `⌘\\` sigue ignorado en Folder |

Hoy ⌘2 y ⌘4 van ambos a Publicaciones (`shortcutLabel.reviews` / `publications`, leftover del rename). El toggle aplica a los dos. **No** re-mapear números en este plan.

---

## Comportamiento (tabla)

| Acción | Pane |
|--------|------|
| Abrir app | Cerrado |
| Click Inbox / Borradores / Publicaciones | Abre (o se queda abierto) |
| Click otra vez el mismo | Sigue abierto, ítem sigue seleccionado |
| ⌘1 con Borradores ya abierto | Cierra (view sigue Drafts) |
| ⌘1 con pane cerrado (sigo en Drafts) | Abre |
| ⌘3 con Borradores abierto | Cambia a Inbox, pane sigue abierto |
| ⌘1 con una carpeta seleccionada | Sale de Folder, abre Borradores |
| Click carpeta del árbol | Cerrado (plan 06) |
| Luego Inbox / Drafts / Pubs | Abre |
| X o ⌘\\ (no Folder) | Cierra |
| Carpeta desaparece del tree | Drafts + abre |

---

## Implementación

### 1. Default cerrado + click abre + atajo alterna

**`apps/desktop/src/screens/home/hooks/useNav.ts`**

```ts
const [workPaneOpen, setWorkPaneOpen] = useState(false);

function onNavigate(next: NavView) {
  // …guards workspace-only…
  setViewState(next);
  setWorkPaneOpen(true); // click: siempre abrir, nunca cerrar
}

function onToggleWorkDest(next: NavView) {
  if (!isWorkspace && isWorkspaceOnlyNav(next.kind)) {
    return;
  }
  if (workPaneOpen && view.kind === next.kind) {
    setWorkPaneOpen(false);
    return;
  }
  onNavigate(next);
}
```

No meter el toggle dentro de `onNavigate`: el rail reenviaría el mismo kind y el click cerraría.

**`useKeyboardShortcuts.ts`** — ⌘1 / ⌘2 / ⌘3 / ⌘4 llaman `nav.onToggleWorkDest`.

Specs `useNav.spec.ts`:

- Arranque → `workPaneOpen === false`
- `onNavigate(Inbox)` → `true`; segundo `onNavigate(Inbox)` → sigue `true` (click)
- `onToggleWorkDest(Drafts)` con pane abierto en Drafts → `false`
- `onToggleWorkDest(Drafts)` con pane cerrado → `true`
- `onToggleWorkDest(Inbox)` con pane en Drafts → Inbox + `true`
- El spec “reopens the work pane when leaving a folder” **cambia el expect inicial** a `false`, el resto igual

Specs `useKeyboardShortcuts.spec.ts`:

- ⌘1 con Drafts + pane abierto → `onToggleWorkDest({ kind: Drafts })`
- ⌘3 con Drafts abierto → `onToggleWorkDest({ kind: Inbox })`

### 2. ListBox no se deselecciona

**`RailNav.tsx`** — `selectedKeys` ya es controlado y `key == null` no llama `onNav`. Falta que el ítem **no se vea** deseleccionado.

- Si HeroUI ListBox expone `disallowEmptySelection` (React Aria), usarlo.
- Si no: en `onSelectionChange`, si `keys` queda vacío, `return` (ya está) y no tocar `view`. El padre sigue pasando `selectedKeys={selected}` → debe quedarse pintado.

Spec: click en Borradores ya seleccionado → `onNav` no se llama; `selectedKeys` sigue `drafts`.

**`RailCollapsedNav`**: el botón siempre llama `onNav`. Correcto (abre, no cierra). Spec: segundo `onPress` en el seleccionado sigue llamando `onNav` con el mismo kind — pane no se cierra porque `onNavigate` solo abre.

### 3. Skeleton + empty del árbol

Hoy `Rail` solo oculta el `Tree` si `needsInit`. Si `payload` es `null`, pinta `Tree` con `roots=[]` y se ve un hueco muerto.

Extraer un hijo presentacional para no meter ternarios gordos en `Rail.tsx`:

**`Rail/components/RailTree.tsx`** (o `Tree` + slots)

| `payload` | UI |
|-----------|-----|
| `null` | `TreeSkeleton` |
| `needsInit` | nada (hint en RailNav) |
| `roots.length === 0` | `TreeEmpty` |
| resto | `Tree` actual |

**`components/Tree/components/TreeSkeleton.tsx`**

- HeroUI `Skeleton`, mismo ritmo que Stage `Loading` / WorkPane
- ~6 filas: cuadrado 16px + barra (anchos distintos: `w-4/5`, `w-3/5`, `w-2/3`…)
- Indentación en algunas filas (`pl-5`) para que parezca árbol
- `role="status"` + `aria-label={t("home.tree.loading")}`
- `aria-hidden` en las barras

**`components/Tree/components/TreeEmpty.tsx`**

Compacto, no `PaneEmpty` (`min-h-48` es demasiado para el rail):

- Icono carpeta
- Título + body muted
- `px-1 py-4` / `text-sm`

i18n (`es` / `en`):

| Key | ES | EN |
|-----|----|----|
| `home.tree.loading` | Cargando páginas | Loading pages |
| `home.tree.emptyTitle` | Sin páginas | No pages yet |
| `home.tree.emptyBody` | Crea una página o una carpeta para empezar. | Create a page or a folder to get started. |

### 4. Antipatterns

- Nada de `loading ? … : empty ? … : map` en `Rail.tsx` → `RailTree` con early returns
- Skeleton: keys fijas (`s1`…`s6`), no `.map` anónimo inline en un archivo grande (el skeleton es el list/item)

---

## Archivos

| Archivo | Qué |
|---------|-----|
| `hooks/useNav.ts` | Default `false`; `onToggleWorkDest` |
| `hooks/__specs__/useNav.spec.ts` | Arranque cerrado; click no cierra; atajo sí |
| `hooks/useKeyboardShortcuts.ts` | ⌘1–4 → `onToggleWorkDest` |
| `hooks/__specs__/useKeyboardShortcuts.spec.ts` | Mismo atajo cierra; otro atajo cambia |
| `Rail/components/RailNav.tsx` | Sin selección vacía |
| `Rail/components/__specs__/RailNav.spec.tsx` | Re-click no deselecciona / no cierra |
| `Rail/Rail.tsx` | Monta `RailTree` |
| `Rail/components/RailTree.tsx` | loading / empty / tree |
| `components/Tree/components/TreeSkeleton.tsx` | Nuevo |
| `components/Tree/components/TreeEmpty.tsx` | Nuevo |
| `components/Tree/__specs__/Tree.spec.tsx` o specs de RailTree | Skeleton + empty |
| `i18n/locales/es.json` + `en.json` | Keys `home.tree.*` |

Opcional: `Tree/index.ts` reexporta skeleton/empty si Rail los importa desde `components/Tree`.

---

## Testing

```bash
npm run test -w @slash-md/desktop -- src/screens/home/hooks --run
npm run test -w @slash-md/desktop -- src/screens/home/components/Rail --run
npm run test -w @slash-md/desktop -- src/components/Tree --run
npm run desktop:typecheck
```

| Spec | Casos |
|------|--------|
| `useNav` | Default `false`; click Inbox dos veces sigue `true`; `onToggleWorkDest` mismo kind cierra; otro kind cambia; folder gone → Drafts + `true` |
| `useKeyboardShortcuts` | ⌘1 con Drafts abierto → cierra; ⌘3 con Drafts abierto → Inbox |
| `RailNav` | Re-click ítem seleccionado no vacía la selección |
| `RailTree` / Tree | `payload null` → status loading; `roots []` → empty title; con roots → nodos |
| `WorkColumn` | Sigue: `workPaneOpen false` → `null` |

---

## Validación manual

| # | Paso | Resultado |
|---|------|-----------|
| 1 | Abrir app | Solo rail + Stage (templates / editor). Sin columna Inbox/Drafts |
| 2 | Click Borradores | WorkPane aparece |
| 3 | Click Borradores otra vez | Pane sigue; ítem sigue seleccionado |
| 4 | ⌘1 con Borradores abierto | Pane se cierra |
| 5 | ⌘1 otra vez | Pane se abre |
| 6 | Borradores abierto → ⌘3 | Inbox, pane sigue |
| 7 | Inbox → Publicaciones (click) | Cambia el contenido, no se cierra |
| 8 | Carpeta del árbol | Pane desaparece |
| 9 | X o ⌘\\ en Drafts | Pane se cierra |
| 10 | Arranque / workspace nuevo (tree null) | Filas skeleton bajo “Workspace” |
| 11 | Wiki sin páginas | Empty “Sin páginas”, CTA de abajo sigue siendo Nueva página |
| 12 | `needsInit` | Hint de init, sin skeleton ni empty del árbol |

**Regresión:** carpeta + templates (plan 04–06); `⋯` new file/folder; overlay rail estrecho; atajos de nav.
