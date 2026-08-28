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

**D-1 — ¿Compacto o alineado?**

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

- [ ] D-1 resuelta y anotada aquí con su razón
- [ ] Editar una celda produce un diff de una sola línea
- [ ] Las tablas alineadas existentes se siguen **leyendo** sin problema
- [ ] `fixtures/table.md` y `fixtures/gallery-blocks.md` actualizadas; round-trip e idempotencia en verde
- [ ] El reformateo de `docs/` y `README.md` va en un commit propio
- [ ] `npm run test` y `npm run lint` en verde
