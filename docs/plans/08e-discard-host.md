# Plan 08e — Host `discardPublication`

> IPC que tira **tu** publicación. Sin React.

**Depende de:** [08d](./08d-discard-github.md) + filtro [08a](./08a-publications-mine-only.md). **Siguiente:** [08f](./08f-discard-ui.md).

---

## Objetivo

`discardPublication(branch: string): Promise<void>`

1. `isPublicationBranch`; si no es **mía** → error (08a).
2. Merge in curso → error (como leave).
3. **GitHub primero** (token + PR open o remote `origin/pub/…`):
   - in_review: `closePull`. Falla → abort.
   - `deleteBranch` remote. Falla → `openPull` → abort (local intacto).
   - Draft con remote sin PR: solo delete remote. Falla → abort.
   - Sin token + in_review → error “sign in” (08f abre modal **antes**; esto es red de seguridad).
4. **Local:** si HEAD === branch → `git switch -f defaultBranch`. Untracked bajo `contentPath`: `git clean -fd -- <contentPath>` (si `contentPath === "."`, **no** `clean -fd` del repo entero: limitar a `*.md` + carpeta images del content, o abortar listing untracked y clean path a path). Extraer `deleteLocalPubBranch` de `publish.ts`.
5. `pull --ff-only` best-effort.
6. `AppOperation.DiscardPublication` + i18n operations.

IPC: `ipc.ts` / `preload.ts` / `shared/api.ts`.

---

## Qué puede salir mal

### Git / disco

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| `switch -f` con untracked **fuera** de contentPath | Se quedan en defaultBranch | Clean **solo** contentPath. Spec mental: `docs/foo.md` untracked se va; `notes.txt` en root no |
| `contentPath === "."` + `clean -fd` | Borra `.env`, artefactos, `node_modules` untracked | **Prohibido** clean raíz. Clean por archivos `status --porcelain` que estén bajo content + `images/` |
| New page untracked + switch -f sin clean | El `.md` reaparece en la wiki como untracked | El clean es obligatorio para markdown de la pub |
| HEAD no es la rama (otras, 08f) | No hacer switch -f | Solo `-D` local + GitHub. Working tree de la pub **montada** no se toca |
| `-D` de la rama actual | Git rechaza | Switch **antes** de `-D` |
| Rama local inexistente (solo remote) | `-D` no-op | OK |
| `switch -f` a default que no existe | Como publish | Error; GitHub **ya** cerró. Mitigar: hacer GitHub **después** de validar que `defaultBranch` existe local o origin. Validar refs **antes** del close |
| Dirty en **otra** pub montada al descartar una no montada | Force no corre | OK. No `clean` |
| Submodule / skip-worktree | switch -f raro | Error al usuario |
| Windows file lock (editor open) | switch falla | 08f cierra editor **antes** del IPC |

### GitHub / atomicidad

| Fallo | Riesgo | Qué hacer |
|-------|--------|-----------|
| Close OK, delete remote 403 | PR closed, rama viva, local intacto si reopen OK | Reopen; si reopen falla: error “revisión cancelada pero no se pudo deshacer; la rama sigue en GitHub” — el peor caso, documentado en 08f |
| Close OK, delete 404 | Rama ya no estaba | Tratar 404 como éxito (igual que `deleteBranch` hoy) |
| Sin PR, remote existe, delete 403 | Abort, local intacto | OK |
| PR merged entre list y discard | close 422 | Abort; copy “ya no está en revisión” |
| Race: alguien pushea mientras cierras | Delete puede fallar | Reopen + abort |
| No es tuya | IPC error | UI nunca ofrece (08a+08f) |

### Sesión

| Fallo | Qué hacer |
|-------|-----------|
| Token expiró a mitad | Close 401 → abort |
| Draft local only, offline | Skip GitHub; local OK |

---

## Criterios

- [x] in_review: close + delete remote + switch -f + -D
- [x] delete remote fail → reopen, **HEAD sigue en la pub**, working tree intacto
- [x] Validar `defaultBranch` existe **antes** de close
- [x] Draft local: sin GitHub
- [x] Ajena: throw
- [x] `contentPath === "."` no hace `git clean -fd` en raíz
- [x] Extraer delete local; publish sigue borrando tras merge
