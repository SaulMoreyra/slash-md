# Plan 13 — El `.md` en disco: dejar de mover los pipes

> Editar una celda reescribe la tabla entera en el archivo. El diff de git toca N filas por cambiar una palabra.

**Independiente de** los planes 11 y 12: este no toca cómo se ve la tabla, sino qué se escribe en disco.
**Alcance:** `packages/ui/src/editor/core/crepe.ts` + `fixtures/`.

---

## Diagnóstico

El editor re-serializa el documento **completo** en cada guardado — `scheduleSave` corre `crepe.getMarkdown()` con 300 ms de debounce (`packages/ui/src/editor/core/save.ts:5`). Y `remark-gfm` viene con `tablePipeAlign: true` y `tableCellPadding: true` (`mdast-util-gfm-table/lib/index.js:154-155`), así que rellena cada celda con espacios hasta la más ancha de su columna.

Consecuencias, en orden de molestia:

1. **Escribir una palabra re-alinea toda la tabla.** El diff toca todas las filas, no la que editaste.
2. **Un `.md` escrito a mano en formato compacto se reescribe entero** en el primer guardado, aunque no toques la tabla.
3. **Las tablas anchas producen líneas larguísimas.** La tabla de prueba del Plan 11 sale a 180 caracteres por línea.

Verificado en headless: la salida actual es internamente consistente —las cuatro líneas miden exactamente 180 caracteres, los pipes sí cuadran— así que no es un bug de alineación. El problema es que el archivo **se mueve respecto a lo que escribiste y a lo que git tiene**.

---

## Objetivo

Que la representación en disco de una tabla dependa solo de su contenido, nunca del ancho de sus vecinas. Editar una celda debe producir un diff de una línea.

---

## El cambio

En `packages/ui/src/editor/core/crepe.ts`, junto a los demás `register*`:

```ts
import { remarkGFMPlugin } from "@milkdown/kit/preset/gfm";

builder.editor.config((ctx) => {
  // remark rellena cada celda hasta la más ancha de su columna: editar una
  // palabra re-alinea la tabla entera y ensucia el diff. Formato compacto.
  ctx.set(remarkGFMPlugin.options.key, { tablePipeAlign: false });
});
```

**El orden funciona** (verificado, no supuesto): `init` espera `ConfigReady` antes de resolver `InitReady` (`@milkdown/core/src/internal-plugin/init.ts:44`, `initTimerCtx: [ConfigReady]`), y `$remark` lee sus opciones **después** de `InitReady` (`@milkdown/utils/src/composable/composed/$remark.ts:33`). El `config` llega a tiempo.

Antes y después:

```markdown
| Campo                          | Tipo   | Requerido |
| ------------------------------ | ------ | :-------: |
| nombre\_completo\_del\_usuario | string |     sí    |

| Campo | Tipo | Requerido |
| - | - | :-: |
| nombre\_completo\_del\_usuario | string | sí |
```

GitHub y el propio editor renderizan las dos igual.

---

## Decisión abierta

**D-1 — ¿Compacto o alineado? → RESUELTA: compacto.**

Razón: medido sobre remark con la misma tabla, editar **una** celda cambia **5 de 5 líneas** con el formato alineado y **1 de 5** con el compacto. El alineado no tiene arreglo intermedio: alinear *es* reflowear.

| Opción | A favor | En contra |
|---|---|---|
| **Compacto** (`tablePipeAlign: false`) — *recomendada* | Diff de una línea por cada edición de una celda. Estable para siempre | La tabla deja de verse alineada al abrir el `.md` en un editor de texto plano |
| Alineado (hoy) | Legible en crudo | Cualquier cambio de longitud reflow­ea la tabla entera. No tiene arreglo: alinear **es** reflowear |

No hay tercera vía: milkdown re-serializa el documento completo en cada guardado, no puede preservar el formato original de una tabla que no tocaste.

**Costo de la opción recomendada, declarado:** el primer guardado de cada documento existente reformatea sus tablas. Conviene un commit de reformateo aparte —`docs/`, `README.md` y `fixtures/` ya tienen tablas alineadas— para que no se mezcle con cambios de contenido.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| El round-trip falla en CI | `fixtures/table.md` y `fixtures/gallery-blocks.md` están alineadas y la suite exige round-trip idéntico | Reescribir ambas en formato compacto **en el mismo commit** |
| El `config` corre tarde y la opción se ignora | El cambio no hace nada y parece que sí | Aserción en la suite: serializar una tabla y comprobar que no hay `| ---- ` con relleno |
| `tablePipeAlign` también afecta al parseo | Se rompe leer tablas alineadas existentes | No: `remark-gfm` pasa las options a `gfm()` (micromark) y a `gfmToMarkdown()`; `tablePipeAlign` solo lo consume el segundo (`mdast-util-gfm-table/lib/index.js:155`). Leer sigue igual |
| El equipo abre PRs con el reformateo mezclado | Reviews imposibles de leer | El commit de reformateo va solo y se anuncia |
| Alguien espera que esto arregle el `\_` | Expectativa fallida | Ver abajo |

### Lo que este plan **no** arregla

`remark-stringify` escapa los guiones bajos: `nombre_completo` se guarda como `nombre\_completo`. Es ruido real en el diff, pero desactivarlo exige un handler propio de serialización y toca todo el documento, no solo las tablas. Fuera de alcance; si molesta, plan aparte.

---

## Cómo verificarlo

```bash
npm run test    # round-trip + idempotencia sobre fixtures/*.md
```

Y a mano: abrir un doc con tabla en `desktop:dev`, escribir una palabra en una celda, `git diff` → **una línea tocada**.

---

## Criterios de aceptación

- [x] **D-1 resuelta: compacto**, con su razón anotada arriba
- [x] Editar una celda produce un diff de **1 línea** (antes: 5 de 5). Medido sobre remark con ambas opciones, y otra vez a través del editor completo
- [x] El `config` llega a tiempo — la salida del editor sale compacta, así que `ConfigReady` precede a `InitReady` como decía el plan
- [x] Las marcas de alineación se conservan: `| - | - | :-: | … | -: |`
- [x] Las tablas alineadas existentes se siguen **leyendo** sin problema (round-trip verde sobre las 10 fixtures)
- [x] `fixtures/table.md` y `fixtures/gallery-blocks.md` reescritas — con un guard que verificó que **solo** cambiaron líneas de tabla (0 líneas fuera de tablas)
- [x] Aserción anti-regresión en `test/integration/crepeRoundtrip.ts`: falla si vuelve a aparecer relleno
- [x] `npm test` exit 0 · `npm run typecheck` exit 0
- [ ] **Decisión pendiente:** si reformatear `docs/` y `README.md` de golpe en un commit propio — ver abajo

### El reformateo masivo es más pequeño de lo que el plan temía

35 archivos del repo tienen tablas, con 874 líneas de tabla en total. De ésas, **768 ya están compactas** escritas a mano. Pasada en seco sobre docs reales:

| Archivo | Líneas | Cambian | De tabla | Fuera de tabla |
|---|---|---|---|---|
| docs/ARCHITECTURE.md | 97 | 10 | 5 | 5 |
| docs/FLOWS.md | 335 | 28 | 7 | 21 |
| docs/DECISIONS.md | 121 | 11 | 5 | 6 |
| README.md | 146 | 14 | 1 | 13 |
| AGENTS.md | 28 | 2 | 2 | 0 |

Conclusión: el churn de **tabla** que este plan elimina es de 1–7 líneas por archivo. Pero la mayoría de lo que cambia al abrir un doc **no son tablas** — y eso ya pasaba antes de este plan.

---

## Lo que este plan destapó y NO arregla

Abrir cualquier doc en SlashMD re-serializa el archivo entero, y eso produce dos cambios ajenos a las tablas:

1. **Viñetas `-` → `\***. remark-stringify usa `*` por defecto. Se arregla con `bullet: "-"` en las opciones de stringify. Cosmético, pero es la mayor parte del churn de `README.md`.

2. **Las imágenes en bloque pierden su `alt`** — y esto **no es cosmético, es pérdida de datos**:

   ```
   ![Slash MD icon](media/slash.png)  ->  ![1.00](media/slash.png)
   ![alt con texto](foo.png)          ->  ![1.00](foo.png)
   ![](foo.png)                       ->  ![1.00](foo.png)
   ![alt](foo.png "un título")        ->  ![1.00](foo.png "un título")
   ```

   El `1.00` parece el `ratio` del `imageBlock` de Crepe escribiéndose en el hueco del alt. Las imágenes **inline** (dentro de un párrafo) se salvan. Verificado también contra `HEAD` limpio (`a671838`) en un worktree aparte: **es preexistente**, no lo introduce ninguno de estos tres planes.

   Merece su propio plan. Cada guardado de un doc con imagen en bloque destruye texto alternativo, que además es accesibilidad.

3. **El escape de `_`**: `nombre_completo` se guarda como `nombre\_completo`. Desactivarlo exige un handler propio de serialización. Fuera de alcance.
