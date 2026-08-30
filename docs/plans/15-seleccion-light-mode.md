# Plan 15 — En light mode el texto seleccionado desaparece

> Sombreas texto en el editor con el tema claro y la fuente se pierde. En oscuro no pasa.

**Alcance:** `packages/ui/src/editor/theme.css`. Cuatro líneas de CSS.

---

## Diagnóstico

Dos reglas que se pisan a medias:

```css
/* apps/desktop/src/styles.css:253 — especificidad (0,0,0) */
::selection {
  background: var(--color-accent-strong);
  color: var(--color-accent-ink);          /* #ffffff */
}

/* Crepe, dentro del editor — especificidad (0,2,1) */
.milkdown .ProseMirror *::selection {
  background: var(--crepe-color-selected); /* solo el fondo */
}
```

Crepe gana el `background` y lo cambia por el tinte suave del tema. Pero **no declara `color`**, así que el `color: #ffffff` de la regla global sobrevive dentro del editor. Resultado en claro: texto blanco sobre `#e4e4e7`.

En oscuro el mismo blanco cae sobre `#27272a`, que sí contrasta — por eso el problema solo se ve en claro.

Medido en Chromium con los tokens reales de `apps/desktop/src/styles.css`:

| Tema | Antes | Después |
|---|---|---|
| **light** | **1.27:1** — ilegible | **13.96:1** |
| dark | 14.89:1 | 12.61:1 |

WCAG AA pide 4.5:1.

---

## El cambio

```css
.milkdown .ProseMirror ::selection,
.milkdown .ProseMirror::selection {
  color: currentColor;
}
```

### Por qué `currentColor` y no otra cosa

Se midieron tres candidatas sobre texto normal, un enlace y código inline:

| Candidata | Texto | Enlace | Código |
|---|---|---|---|
| `color: inherit` | 1.18 | 1.18 | 1.18 |
| `color: currentColor` | 10.39 | 3.29 | 2.95 |
| `color: var(--slash-text)` | 10.39 | 10.39 | 10.39 |

- **`inherit` no sirve**: en `::selection`, `inherit` toma el valor del `::selection` del padre, que es el blanco de la regla global. No arregla nada.
- **`var(--slash-text)`** arregla todo pero **aplana** enlaces y código inline al color del texto normal mientras están seleccionados: un enlace seleccionado deja de parecer un enlace.
- **`currentColor`** devuelve a cada elemento su propio color, que es lo que Crepe pretendía con su regla de solo-fondo.

Los 3.29 y 2.95 de enlace y código **no los causa la selección**: sin seleccionar miden 3.88 y 3.08 sobre la página. `currentColor` conserva el contraste propio de cada elemento casi intacto. Que enlaces y código inline anden por debajo de AA es una decisión previa del tema y no se toca aquí.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| El tinte de selección se ve demasiado sutil | Cuesta ver qué está seleccionado | Es el `--slash-selected` del tema, intencionadamente suave estilo Notion. No se toca en este plan |
| Dark baja de 14.89 a 12.61 | Regresión de contraste | Sigue muy por encima de AA. El texto pasa de blanco puro al `--slash-text` del tema, que es lo coherente |
| El host cambia su `::selection` global | Vuelve a filtrarse | La regla vive en el tema del editor, así que el editor queda autoconsistente en desktop y en VS Code |

---

## Criterios de aceptación

- [x] Light: el texto seleccionado se lee — 1.27:1 → **13.96:1**
- [x] Dark: sigue legible — 12.61:1
- [x] Fuera del editor la selección no cambia — 6.38:1 antes y después
- [x] Enlaces y código inline conservan su color al seleccionarlos
- [x] `npm test` exit 0 · `npm run typecheck` exit 0 · `npm run lint` sin errores nuevos
- [ ] **Pendiente en la app real:** sombrear un párrafo en claro y en oscuro

Sin test automático: el contraste de `::selection` necesita motor de layout, y la suite corre en happy-dom. Se midió con Electron.
