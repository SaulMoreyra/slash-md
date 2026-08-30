# Plan 14 — Las imágenes en bloque pierden su `alt`

> `![Slash MD icon](media/slash.png)` se guarda como `![1.00](media/slash.png)`. Es pérdida de datos, y de accesibilidad.

**Independiente de** los planes 11–13; lo destapó la pasada en seco del Plan 13.
**Alcance:** `packages/ui/src/editor/plugins/imageAlt.ts` (nuevo) + registro en `packages/ui/src/editor/core/crepe.ts`.

---

## Diagnóstico

No es un bug sutil: el schema `image-block` de Milkdown **no tiene atributo `alt`**. Usa deliberadamente la ranura `alt` del markdown para persistir el `ratio` de la imagen (`@milkdown/components/src/image-block/schema.ts`):

```ts
attrs: {
  src:     { default: '' },
  caption: { default: '' },
  ratio:   { default: 1 },      // ← no hay `alt`
},
parseMarkdown: {
  let ratio = Number((node.alt as string) || 1)      // "Slash MD icon" -> NaN
  if (Number.isNaN(ratio) || ratio === 0) ratio = 1  // ← el alt se tira aquí
},
toMarkdown: {
  alt: `${Number.parseFloat(node.attrs.ratio).toFixed(2)}`,   // ← "1.00"
},
```

El `title` del markdown se usa para el `caption`, así que de las tres ranuras que da la sintaxis (`url`, `alt`, `title`) el `alt` es la que se sacrifica.

Medido, y verificado también contra `HEAD` limpio (`a671838`) en un worktree aparte para descartar que lo introdujeran los planes 11–13:

```
![Slash MD icon](media/slash.png)   ->  ![1.00](media/slash.png)
![alt con texto](foo.png)           ->  ![1.00](foo.png)
![](foo.png)                        ->  ![1.00](foo.png)
![alt](foo.png "un título")         ->  ![1.00](foo.png "un título")
Párrafo con ![inline](x.png) …      ->  intacto
```

Solo afecta a las imágenes **en bloque** (párrafo con una sola imagen), que es la forma normal de poner una imagen en un doc. Las inline se salvan porque no pasan por este schema. `README.md` lo sufre hoy.

---

## Objetivo

Que el `alt` que escribió una persona sobreviva a un guardado.

---

## Decisión

**D-2 — ¿Alt o ratio?**

Markdown tiene tres ranuras y Milkdown ya gasta dos (`url` = src, `title` = caption). Preservar el `alt` significa **dejar de persistir el `ratio`**: no hay dónde meterlo. Las opciones descartadas —codificar el ratio junto al alt, o colgarlo del `src` como `#ratio=0.5`— son ambiguas al leer o ensucian el archivo.

**Resuelta: preservar el `alt`.** Razón, para un producto que publica docs a GitHub:

| | `alt` | `ratio` |
|---|---|---|
| Lo escribe una persona | sí | no, sale de arrastrar |
| GitHub lo respeta al renderizar | sí | **no, lo ignora** |
| Accesibilidad | es su único propósito | ninguna |
| Si se pierde | no se puede reconstruir | se vuelve a arrastrar |

**Coste declarado:** una imagen redimensionada en el editor vuelve a su tamaño natural al reabrir el archivo. El redimensionado sigue funcionando **dentro de la sesión**. Es un cambio de una línea en `toMarkdown` si algún día se decide al revés.

---

## El cambio

`imageBlockSchema.extendSchema` — el camino soportado: `upsertById` (`@milkdown/utils/src/composable/utils.ts:20`) reemplaza el schema **en su sitio**, sin moverlo al final, que es justo lo que Milkdown documenta que hay que preservar.

```ts
// packages/ui/src/editor/plugins/imageAlt.ts
export const imageBlockWithAlt = imageBlockSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx);
  return {
    ...base,
    attrs: { ...base.attrs, alt: { default: "", validate: "string" } },
    parseMarkdown: { /* alt: node.alt, sin tocar el ratio */ },
    toMarkdown:    { /* alt: node.attrs.alt */ },
  };
});
```

`toDOM` no se toca: el original hace `['img', { ...node.attrs }]`, así que el nuevo `alt` sale solo. `parseDOM` sí, para que copiar y pegar dentro del editor no lo pierda.

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|---|---|---|
| El schema extendido no gana sobre el de Crepe | El bug sigue igual y parece arreglado | `upsertById` reemplaza por id. Aserción en la suite sobre el markdown de salida |
| Re-registrar el schema lo manda al final | ProseMirror puede recursar infinito en el content-match (lo avisa el propio Milkdown) | Es justo lo que `upsertById` evita; no reimplementarlo a mano con `push` |
| Docs ya guardados tienen `![1.00]` | El daño viejo no se deshace solo | No se puede: el texto original ya no está en el archivo. Solo se corrige a mano. Este plan detiene la sangría, no la revierte |
| El `ratio` deja de persistir sin avisar | Alguien redimensiona, recarga y cree que se rompió | Declarado en D-2 |
| Un `alt` con `]` o `"` | Markdown mal formado | `remark-stringify` escapa; cubierto por el round-trip |

---

## Cómo verificarlo

Aserciones en `test/integration/crepeRoundtrip.ts` sobre los cuatro casos del diagnóstico, más una fixture nueva con una imagen en bloque con alt.

---

## Criterios de aceptación

Los cuatro casos del diagnóstico, más el inline, verificados a través del editor completo:

```
ok  "![Slash MD icon](media/slash.png)"
ok  "![alt con texto](foo.png)"
ok  "![](foo.png)"
ok  "![alt](foo.png \"un título\")"
ok  "Párrafo con ![imagen inline](x.png) en medio."
```

- [x] `![Slash MD icon](media/slash.png)` sobrevive un round-trip sin cambios
- [x] Un alt vacío sigue vacío — no aparece `1.00`
- [x] El `title`/caption se conserva junto al alt
- [x] Las imágenes inline siguen intactas
- [x] `fixtures/links-image.md` corregida — **tenía el bug fosilizado** (`![1.00](./images/diagram.png "Diagrama")`), que es por lo que el round-trip pasaba en verde
- [x] 8 aserciones nuevas en `test/integration/crepeRoundtrip.ts`, incluida una que falla si vuelve a aparecer `![1.00]`
- [x] El schema extendido gana sobre el de Crepe (`upsertById` reemplaza por id)
- [x] `npm test` exit 0 · `npm run typecheck` exit 0 · `npm run lint` sin errores nuevos
- [x] Churn de `README.md`: 14 → 13 líneas; la línea de la imagen ya no se toca

### Lo que este plan no deshace

Los docs ya guardados con `![1.00]` **no se recuperan**: el texto original ya no está en el archivo. Este plan detiene la sangría; corregir los existentes es a mano. En este repo el único caso era la fixture, ya corregida.

### Lo que sigue pendiente del churn

Tras este arreglo, lo que queda al abrir un doc es sobre todo el **marcador de viñeta**: `remark-stringify` escribe `*` donde el repo usa `-`. Son 12 de las 13 líneas que aún cambian en `README.md` y 21 de 28 en `docs/FLOWS.md`. Se arregla con `bullet: "-"` en las opciones de stringify. No entra aquí — sería un plan 15 de una línea.
