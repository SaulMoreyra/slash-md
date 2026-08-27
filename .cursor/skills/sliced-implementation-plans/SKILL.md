---
name: sliced-implementation-plans
description: >-
  Splits a large implementation plan into an index plus small sequential slices
  (11 / 11a / 11b). Use when the user asks for a plan de implementación,
  implementation plan, docs/plans, or to break a feature into reviewable steps.
  Canonical examples: docs/plans/10-wiki-after-github-merge.md and
  docs/plans/11-reader-site.md.
---

# Sliced implementation plans

Write **one index + small slices**, never a single 200-line plan that mixes config, UI, CI, and docs.

Canonical shape in this repo: `docs/plans/NN-name.md` + `docs/plans/NNa-….md`. See [examples.md](examples.md).

## When

- User asks for a **plan de implementación** / implementation plan for a feature with **more than one deliverable**.
- A slice would touch **unrelated layers** (core vs Electron vs workflow vs copy).
- You would otherwise dump closed decisions, file lists, and failure tables into one file.

**Do not slice** a one-file bugfix or a change that is already a single PR.

## Index (`NN-name.md`)

The index is the map. **It does not implement.**

Must include:

1. **One-line intent** (blockquote under the H1).
2. **Depends / does not depend / do not touch** (explicit).
3. **Objetivo** — short diagram or pipeline, not a file list.
4. **Orden** — ASCII DAG of slices (`11a → 11b → 11c`). Call out what can run **in parallel**.
5. **Table** — letter → link → one-line entrega.
6. **Decisiones (cerradas)** — product/arch choices that every slice must obey. Put them **here**, not repeated in every slice.
7. **Qué no es este plan** — out of scope.
8. **Comandos** to run when closing **each** slice.

Number: next free `NN` after the latest plan in `docs/plans/README.md`.

## Slice (`NNa-name.md`)

Each slice is **one shippable step**: one layer or one user-visible entrega. A reviewer should be able to implement it without reading later slices.

Must include:

| Section | Content |
|---------|---------|
| Depends | Previous slice(s). Index link. |
| Objetivo | What lands, in one paragraph + optional sketch |
| Contrato / reglas | Only what **this** slice owns |
| Qué puede salir mal | Table: fallo → qué hacer |
| Archivos | Concrete paths. **No** files that belong to a later slice |
| Criterios | Checkboxes. Testable. No “and also the workflow” if that is 11d |

**Forbidden in a slice:** re-litigating index decisions; listing the whole feature’s files; “also do Init” when Init is another letter.

### Slice size

Split when any of these is true:

- Different **runtime** (core pure vs Node fs vs browser bundle vs GitHub Actions vs Desktop UI)
- Later work **cannot compile** without this slice’s types/helpers
- Mix of **product copy** (Init, READING) with **engine** (parser, CI)
- More than ~one “entrega” in the table row

Prefer **3–6 slices**. If you need 10, the feature is two indexes (or the DAG is wrong).

### Naming

- Index: `NN-short-kebab.md` (capability: `11-reader-site`)
- Slices: `NN` + letter + kebab (`11a-site-config-and-routes`)
- Letters follow the DAG, not “size”. Parallel work still gets sequential letters; the **Orden** diagram shows the fork.

## After writing

1. Add a section + rows to `docs/plans/README.md` (index + every slice).
2. Link **Depends de / Siguiente** between adjacent slices.
3. Do **not** start coding unless the user asked to implement a specific slice.

## Language

Match existing `docs/plans/` (this repo: Spanish headings and body). Keep identifiers (`site.enabled`, paths, command names) in code font.
