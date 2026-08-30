# Plan 16 — El código inline largo abarca todo el ancho

> Un `código` inline que no cabe en una línea se convierte en una banda gris a todo lo ancho, en vez de seguir el texto.

**Alcance:** `packages/ui/src/editor/theme.css`. Solo CSS.

---

## Qué se reportó y qué es en realidad

El reporte decía «bloques de código de más de dos líneas». La captura (`code_block.png`) muestra otra cosa: es **código inline**, dentro de un párrafo, en mitad de una frase:

> La barra lateral no lee el resolver: mapea la **URL** a un número de paso (`app:apps/web/src/.../useConfig.js:29-70`). Todo `/requisition/*` es el paso 0…

El span largo parte en dos líneas y el fondo gris cubre el ancho completo de **ambas**, incluido el hueco vacío a la derecha de `70`. Los cortos (`/requisition/*`) se ven bien. No hay ningún bloque cercado implicado.

---

## Diagnóstico

`@milkdown/crepe/theme/common/reset.css:163`:

```css
.milkdown .ProseMirror code {
  padding: 0 2px;
  border-radius: 4px;
  font-size: 87.5%;
  display: inline-block;      /* ← aquí */
  line-height: 1.4286;
}
```

Las reglas del repo pisan fondo, radio, padding, fuente y tamaño —`packages/ui/src/editor/theme.css:1195` y `apps/desktop/src/styles.css:607`— pero **ninguna pisa el `display`**. Así que sobrevive `inline-block`.

Un `inline-block` no fluye con el texto: es una caja. Cuando su contenido no cabe, la caja crece hasta el ancho disponible y envuelve **por dentro**, quedando un rectángulo de dos líneas de alto con el fondo pintado hasta el borde.

Medido en Chromium sobre el párrafo de la captura:

| | Sin arreglo | Con arreglo |
|---|---|---|
| `display` computado | `inline-block` | `inline` |
| Fragmentos de línea | **1** (una caja) | **2** (uno por línea) |
| Ancho | **790 px** | 695 px + **123 px** |
| Ancho del párrafo | 704 px | 704 px |

790 > 704: hoy la caja **se sale del párrafo**. Con el arreglo, el segundo fragmento mide 123 px — se ciñe a `nfig.js:29-70` en vez de llegar al borde.

---

## El cambio

```css
.milkdown .ProseMirror :not(pre) > code {
  display: inline;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
```

> **Acotado al implementar.** El plan proponía `.milkdown .ProseMirror code`, sin más.
> Medido, eso también cambiaba el `<code>` de los bloques cercados (`pre > code`) de
> `inline-block` a `inline` — se veía bien solo porque comparte el color de fondo con
> el `<pre>`, pero con `box-decoration-break: clone` cada línea del bloque puede
> acabar dibujando su propia pastilla. `:not(pre) > code` deja los cercados
> exactamente como estaban. Especificidad (0,2,2), así que gana al reset de Crepe.

Va en `theme.css` (compartido), no en `styles.css` del desktop: el origen es el reset de Crepe, así que arreglarlo en el tema del editor cubre también la extensión de VS Code.

### Por qué también `box-decoration-break: clone`

Sin él, un inline que envuelve reparte el padding y el radio solo entre el principio del primer fragmento y el final del último: los bordes interiores quedan cortados a cuchillo y se sigue leyendo como una banda partida. Con `clone`, cada fragmento se dibuja como una pastilla completa.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| El padding vertical se come las líneas vecinas | En un `inline`, el padding vertical no separa líneas: se solapa | El padding actual es `0.1em`/`0.15em`, muy pequeño. Verificar a ojo en un párrafo denso; si molesta, bajarlo a `0` en vertical |
| Crepe depende de `inline-block` para el cursor | Colocar el caret al borde del código se vuelve raro | ProseMirror trata el código como marca de texto, no como nodo atómico. Probar caret al principio y al final del span |
| `box-decoration-break` sin soporte | Fragmentos sin esquinas | Chromium lo soporta con prefijo y sin él; desktop y VS Code son Chromium |
| Se rompen los bloques cercados | Son `pre > code`, otra caja | La regla apunta a `code`; comprobar que un bloque cercado no cambia |

---

## Cómo verificarlo

No hay test automático: hace falta motor de layout y la suite corre en happy-dom. Se midió con Electron, comparando `display`, número de fragmentos y anchos, más captura de pantalla.

En la app: pegar en un párrafo un código inline largo (una ruta con `/`) y comprobar que el fondo sigue al texto en las dos líneas.

---

## Criterios de aceptación

Medido en Chromium (Electron) sobre el párrafo de la captura, con el `theme.css` real bundleado y las reglas de `apps/desktop/src/styles.css` encima, respetando el orden de importación de `main.tsx`.

| | Antes | Ahora |
|---|---|---|
| `display` del código inline | `inline-block` | `inline` |
| Fragmentos de línea | 1 (una caja) | **2** |
| Anchos | 790 px | 695 + **123 px** |
| ¿Se sale del párrafo (704 px)? | **sí** | **no** |
| Código inline corto | 131 px | 131 px |
| `display` del `pre > code` | `inline-block` | `inline-block` |

- [x] El código inline largo parte en dos fragmentos ceñidos al texto, sin banda a todo lo ancho
- [x] Ya no se sale del ancho del párrafo
- [x] Los códigos inline cortos se ven igual que antes (131 px, idéntico)
- [x] Los bloques cercados no cambian — la regla se acotó a `:not(pre) > code` justo por esto
- [x] Sin solape vertical con las líneas vecinas: +4 px de hueco en un párrafo de dos líneas con código en ambas
- [x] `npm test` exit 0 · `npm run typecheck` exit 0 · `npm run lint` sin errores nuevos
- [ ] **Pendiente en la app real:** el caret se coloca bien al principio y al final del span
- [ ] **Pendiente en la app real:** comprobar en la extensión de VS Code

El arreglo no toca colores, así que claro y oscuro se comportan igual: los tokens no intervienen.

Sin test automático: hace falta motor de layout y la suite corre en happy-dom. Se midió con Electron, con captura de pantalla antes/después.
