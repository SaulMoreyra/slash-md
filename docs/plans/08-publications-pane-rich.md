# Plan 08 — Publicaciones (índice)

> Serie pequeña. Decisiones en este archivo; cada subplan se implementa y acepta **solo**.

**No depende de** [09-workpane-closed-tree-empty.md](./09-workpane-closed-tree-empty.md). Sí de [01-git-context.md](./01-git-context.md) (`runOp` ya está en código).

---

## Orden

```
08a  solo las mías
        │
        ▼
08b  card de estado (sin jerga git)
        │
        ▼
08c  hub de acciones (CTA + ⋯ actual, modal solo Enviar)
        │
        ▼
08d  GitHub close/reopen          ← puede ir en paralelo con 08b/08c
        │
        ▼
08e  host discardPublication
        │
        ▼
08f  UI Descartar (modal + ⋯ en actual y en otras)
```

| # | Plan | Entrega |
|---|------|---------|
| a | [08a-publications-mine-only.md](./08a-publications-mine-only.md) | **Hecho.** Lista = mis pubs. HEAD ajena sigue visible si ya estás en ella |
| b | [08b-publication-status-card.md](./08b-publication-status-card.md) | **Hecho.** Estado humano; `PrStrip` fuera del pane |
| c | [08c-publication-action-hub.md](./08c-publication-action-hub.md) | **Hecho.** Un CTA; Wiki/GitHub/copiar en `⋯`; modal sin Leave/Publish |
| d | [08d-discard-github.md](./08d-discard-github.md) | **Hecho.** `closePull` / `openPull` + specs |
| e | [08e-discard-host.md](./08e-discard-host.md) | **Hecho.** IPC `discardPublication` (sin UI en este plan) |
| f | [08f-discard-ui.md](./08f-discard-ui.md) | **Hecho.** Confirmación, sign-in, menú en filas |

No saltar **c → f** sin **e** (el menú llamaría a un IPC que no existe). No saltar **e → f** sin **d** si hay PR (e usa close/reopen).

---

## Decisiones (cerradas)

| Tema | Decisión |
|------|----------|
| Audiencia | No-developer. Nada de `pub/…` ni `PR #` en card/filas |
| Superficies | Pane = hub. FAB = atajo Enviar. Modal = solo confirmar envío |
| Card `w-80` | Título + estado + **un** CTA. Resto en `⋯` |
| Arrepentirse | Una acción: Descartar = cierra PR + borra remote + wiki + borra local |
| Working tree | Tras confirmar: `switch -f` + `clean` bajo `contentPath` |
| Fallo remote | Todo o nada: reabrir PR, no tocar local |
| Editor | Cerrar página en Leave y Descartar |
| Auth | In review → SignIn. Draft local sin token OK |
| Dueño | Solo las mías. Otras **mías** no montadas: sí se descartan |

P1+ (fuera de la serie): cerrar PR y seguir en draft; pubs ajenas; quitar FAB.

**Merge en GitHub → wiki local:** [10](./10-wiki-after-github-merge.md) (`published`, Actualizar wiki, prune). No es historial de publicadas: solo reclasifica `pub/` que aún existen.

---

## Comandos

```bash
npm run test -- --run apps/desktop/src/screens/home/components/PublicationsPane
npm run test -- --run packages/github
npm run desktop:typecheck
npm run desktop:lint
```
