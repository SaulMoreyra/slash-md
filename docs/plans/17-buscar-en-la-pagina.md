# Plan 17 — Buscar dentro de la página actual

> Hoy `Cmd+K` busca **páginas** en la biblioteca. No hay forma de buscar **dentro** del documento abierto.

**Alcance:** `packages/ui/src/editor/plugins/` (nuevo plugin), `apps/desktop/src/components/CrepeCanvas/`, `apps/desktop/src/screens/editor/`, `apps/desktop/electron/menu.ts`.

---

## Lo que ya existe

| Pieza | Dónde | Qué hace |
|---|---|---|
| `useSearch` | `screens/home/hooks/useSearch.ts` | Busca **páginas** por título sobre el árbol (`rankLibraryHits`). No mira el contenido |
| `Cmd+K` | `home/hooks/useKeyboardShortcuts.ts:85` + `electron/menu.ts:106` | Abre ese buscador de biblioteca |
| `commentsProse` | `packages/ui/src/editor/plugins/commentsPlugin.ts:39` | Plugin de ProseMirror que ya pinta decoraciones sobre el documento — **el precedente a seguir** |

**`Cmd+F` está libre**: no aparece en ningún atajo ni en el menú.

---

## Objetivo

Buscar texto en el documento abierto: resaltar todas las coincidencias, moverse entre ellas y saber cuántas hay.

**Fuera de alcance, declarado:** reemplazar, expresiones regulares, y buscar en documentos no abiertos (para eso está `Cmd+K`).

---

## Tres caminos

**A — `webContents.findInPage()` de Electron.** Gratis y nativo. **Descartado:** busca en toda la ventana (barra lateral, panel de publicaciones, chrome incluidos), no se puede acotar al documento, no da control sobre el resaltado y se lleva mal con `contenteditable`. Además no existiría en la extensión de VS Code.

**B — Dependencia `prosemirror-search`.** Hace justo esto. **No está instalada** (verificado). Trae comandos y decoraciones ya resueltos, pero también su propio modelo de estado y su UI implícita, y una dependencia nueva en un monorepo que hoy no la necesita.

**C — Plugin propio de decoraciones.** ~80 líneas siguiendo exactamente el patrón de `commentsPlugin.ts`, que ya recorre el documento y devuelve un `DecorationSet`. **Elegido:** control total del resaltado, del recuento y de la navegación; cero dependencias; y vive en `packages/ui`, así que la extensión de VS Code lo hereda.

---

## El obstáculo real: no hay acceso al editor desde React

`CrepeCanvas` guarda el `CrepeBuilder` en un ref **privado** (`apps/desktop/src/components/CrepeCanvas/CrepeCanvas.tsx:35`) y no lo expone. Sin acceso a la vista de ProseMirror no se puede ni consultar el documento ni despachar la transacción que mueve la selección.

Es la parte del plan con más riesgo de tocar código que hoy funciona, y por eso va primero y sola:

1. `CrepeCanvas` acepta una prop nueva —un callback tipo `onReady(api)` o un `ref` imperativo— que entrega una API acotada: `search(query)`, `next()`, `prev()`, `clear()`. **No** el builder entero: exponerlo invita a que cualquier pantalla manipule el editor por su cuenta.
2. La API se implementa **dentro** de `packages/ui`, junto al plugin. `CrepeCanvas` solo la reenvía.

---

## Piezas

### 1. `packages/ui/src/editor/plugins/search.ts`

Plugin `$prose` con estado propio:

- `query`, `matches: {from, to}[]`, `active: number`
- Recalcula al cambiar la query y en cada `docChanged`
- `decorations`: una `Decoration.inline` por coincidencia, con clase `slash-search-hit` y `slash-search-hit-active` en la activa
- Comandos `searchNext` / `searchPrev`: mueven `active`, despachan `TextSelection` y `scrollIntoView()`

### 2. Estilos

`.slash-search-hit` y `.slash-search-hit-active` en `theme.css`, con tokens del tema. **Cuidado:** que la coincidencia activa se distinga de la selección normal, y que ambas se lean en claro — es exactamente el fallo del [Plan 15](./15-seleccion-light-mode.md), así que hay que medir contraste, no elegir a ojo.

### 3. UI: barra de búsqueda

Componente nuevo bajo `screens/editor/components/`, siguiendo la convención de `.cursor/rules/desktop-react-components` (carpeta `Name/` con `Name.tsx`, `index.ts`, `__specs__/`, y `hooks/useNameController.ts`). Campo, contador `3 / 12`, botones anterior/siguiente y cerrar.

### 4. Atajo y menú

- `Cmd+F` en `screens/editor/hooks/useKeyboardShortcuts.ts` (libre)
- `Escape` cierra: encaja en la cadena de `Escape` que ya existe ahí, **antes** de `onClose()` para no cerrar la página sin querer
- `Enter` / `Shift+Enter` → siguiente / anterior
- `MenuAction.FindInPage` nuevo en `apps/desktop/shared/menu.ts`, con su entrada en el menú Editar junto a la de `Cmd+K`

---

## Decisiones abiertas

**D-3 — ¿La búsqueda incluye el título de la página?**
El título es un `contentEditable` **fuera** de ProseMirror (`Canvas.tsx`, `#hero-title`), así que no lo ve el plugin. Recomendación: **no** en la primera versión, y decirlo en la UI si el término solo aparece en el título. Incluirlo obliga a un segundo mecanismo de resaltado sobre un nodo que no es del editor.

**D-4 — ¿Qué pasa con el texto dentro de bloques de código?**
CodeMirror monta sus propios editores dentro del documento; sus contenidos no son texto plano de ProseMirror. Recomendación: **excluirlos** en la primera versión y declararlo.

**D-5 — ¿Sensible a mayúsculas?**
Recomendación: insensible por defecto, sin opción, hasta que alguien la pida.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| Exponer el builder entero desde `CrepeCanvas` | Cualquier pantalla acaba manipulando el editor; se pierde el único punto de control | Exponer solo `search/next/prev/clear` |
| Recalcular en cada tecla en un doc largo | Se traba al escribir la query | Debounce corto y recorrido único del documento; medir con un doc real de `docs/` antes de dar por bueno |
| El resaltado se confunde con la selección | El usuario no sabe cuál es la coincidencia activa | Medir contraste de las dos clases en claro y oscuro. Ver Plan 15 |
| `Escape` cierra la página en vez del buscador | Pérdida de contexto | Insertarlo en la cadena de `Escape` existente, antes de `onClose()`, con spec |
| Las decoraciones chocan con las de comentarios | Resaltados encimados o perdidos | Son dos plugins con su propio `DecorationSet`; ProseMirror los compone. Probar con un PR abierto y comentarios activos |
| `Cmd+F` se lo come el `contenteditable` | El atajo no llega | El listener va en `document` como los demás del editor; comprobar con el caret dentro del canvas |
| Buscar mientras hay un thread abierto | Dos overlays compitiendo | Decidir precedencia; probablemente cerrar el thread al abrir la búsqueda |

---

## Orden de ejecución

```
1. API acotada en CrepeCanvas   (lo más arriesgado; sin UI todavía)
        │
        ▼
2. Plugin de búsqueda + estilos (verificable con specs y contraste medido)
        │
        ▼
3. Barra de búsqueda + atajo + menú
```

---

## Criterios de aceptación

- [ ] `Cmd+F` abre la barra con el foco en el campo
- [ ] Escribir resalta todas las coincidencias y muestra `n / total`
- [ ] `Enter` / `Shift+Enter` y los botones recorren las coincidencias en orden del documento
- [ ] La coincidencia activa se distingue de las demás **y** de la selección normal, medido en claro y oscuro
- [ ] La coincidencia activa entra en el viewport al navegar
- [ ] `Escape` cierra la barra y limpia el resaltado, **sin** cerrar la página
- [ ] Sin coincidencias: `0 / 0` y sin resaltados
- [ ] Editar el documento con la barra abierta recalcula el resaltado
- [ ] Funciona con comentarios activos sin romper sus decoraciones
- [ ] D-3, D-4 y D-5 resueltas y anotadas con su razón
- [ ] Specs de los componentes nuevos; `npm test`, `npm run typecheck` y `npm run lint` sin errores nuevos
