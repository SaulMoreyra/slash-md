# Plan 08d — GitHub: cerrar y reabrir PR

> APIs para el rollback de Descartar. **Sin UI y sin borrar ramas.**

**Depende de:** nada de 08 UI. **Siguiente:** [08e](./08e-discard-host.md).

---

## Objetivo

En `packages/github/src/api.ts`:

```ts
closePull(token, repo, number): Promise<GithubPull>  // PATCH { state: "closed" }
openPull(token, repo, number): Promise<GithubPull>   // PATCH { state: "open" }
```

Si ya está closed, `closePull` devuelve el PR (GET o PATCH idempotente). Si ya está open, `openPull` igual.

No borrar branch aquí (`deleteBranch` ya existe). No mergear.

Specs: mock de `githubRequest` (status 200, 404, 422 already merged, 403).

---

## Qué puede salir mal

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| Close de PR **merged** | 422 | Throw claro `PR is not open` / merged. 08e no debe close si `merged_at` |
| Close 404 | Número stale | Throw; 08e aborta, local intacto |
| Close 403 | Sin permiso (no eres author, org) | Throw; 08f copy: no se pudo cancelar la revisión |
| Reopen 422 | Head branch ya borrada | 08e **no** borra remote **antes** de close. Reopen falla = no hay rollback. Orden es close → delete remote → si delete falla reopen. Spec 08d: openPull 422 se propaga |
| Reopen de merged | Imposible | No llamar |
| Draft GitHub (state open, draft true) | Close igual sirve | Sin campo extra |
| Network abort 20s | `GithubApiError` 408 ya existe | Propagar |
| `state: "closed"` cierra **sin** comentario | Reviewers solo ven el close de GitHub | OK v1 |

---

## Criterios

- [x] close/open cubiertos en spec (ok, idempotente, 403, 422)
- [x] Nada de desktop/UI
