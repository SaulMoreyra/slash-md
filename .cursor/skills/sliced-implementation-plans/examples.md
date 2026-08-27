# Examples

Gold standard in this repo: **[11-reader-site](../../../docs/plans/11-reader-site.md)** and **[10-wiki-after-github-merge](../../../docs/plans/10-wiki-after-github-merge.md)**.

## Index vs slices (plan 11)

| File | Owns | Does not own |
|------|------|----------------|
| `11-reader-site.md` | Opt-in, Crepe-not-Docsify, DAG, closed decisions | File lists, YAML, Init fields |
| `11a` | `site` in `.slashmd.json`, `routeFor`, parse in core | `_site/`, Crepe, Actions |
| `11b` | Walk + artifact shells | Reader JS, workflow |
| `11c` | Crepe read-only + tree + search | `publish-reader.yml` |
| `11d` | Reusable workflow | Init toggle |
| `11e` | Init + READING | Reader bundle |

Pipeline in the index; **one runtime per slice**.

## DAG snippet (copy this shape)

```
11a  contrato (core)
        │
        ├──► 11b  build (Node)
        │         │
        │         ▼
        │    11c  UI bundle
        │         │
        │         ▼
        │    11d  CI
        │
        └──► 11e  Init + docs   (after 11a; snippet from 11d)
```

State what **must not** skip (`a → b → c`) and what **may** parallel (`e` after `a`).

## Slice skeleton

```markdown
# Plan NNx — Título corto

> Una entrega.

**Depende de:** [NNw](./NNw-….md). **Índice:** [NN](./NN-….md).

---

## Objetivo

…

## Contrato / reglas

…

## Qué puede salir mal

| Fallo | Qué hacer |
|-------|-----------|
| … | … |

---

## Archivos

- `path/to/file.ts`
- Tests: …

No [thing that is the next letter].

---

## Criterios

- [ ] …
```

## Anti-example

One file titled “Plan 11” that contains `.slashmd.json` schema, `build-site.mjs` layout, Crepe boot, `workflow_call` YAML, **and** Init copy. That is the index **plus** every slice — split it.
