# Flujos — Slash MD

Cómo deben usarse los flujos del producto: **quién hace qué**, **en qué superficie** (Home vs editor), y **qué pasa bajo el capó**.

Guía de instalación y UI: [USAGE.md](USAGE.md). Mapa técnico host ↔ webview: [ARCHITECTURE.md](ARCHITECTURE.md). Lectura publicada: [READING.md](READING.md).

---

## 1. Elegir el modo

El modo vive en `.slashmd.json` (`mode`). Define el ciclo de publicación entero.

```mermaid
flowchart TD
  start([Abrir repo de docs + Init]) --> ask{¿Equipo con review en GitHub?}
  ask -->|Sí| ws["mode: workspace"]
  ask -->|No, solo yo| pe["mode: personal"]
  ask -->|Solo editar .md sin GitHub| ed[Editor mode]
  ws --> homeWs[Home: staging → PR → merge]
  pe --> barPe[Editor: Publish = commit + push]
  ed --> local[Open with Slash MD · sin Review/Publish]
```

| Modo | Cuándo usarlo | Review | Publish |
|------|---------------|--------|---------|
| **Workspace** (default) | Docs de equipo, branch protection, CODEOWNERS | Home: **Mandar a Revisión** → PR | Home: **Aprobar y Publicar** tras approval |
| **Personal** | Repo solo, sin PR obligatorio | No hay | Barra del editor → push a `defaultBranch` |
| **Editor** | Fuera del wiki, o solo WYSIWYG | No | No |

**Regla de oro (wiki + Workspace):** escribe en el **editor**; manda a revisión y publica solo desde **Home**.

---

## 2. Ciclo principal — Workspace (local-first)

Flujo recomendado para documentación de producto.

```mermaid
stateDiagram-v2
  [*] --> draft: New page / editar local
  draft --> draft: Autosave disco
  draft --> in_review: Mandar a Revisión
  in_review --> in_review: Re-enviar mismo lote / mismo PR
  in_review --> published: Aprobar y Publicar
  published --> draft: Editar de nuevo (cambios locales)
  published --> [*]
```

### Pasos de uso

| # | Quién | Dónde | Acción |
|---|-------|-------|--------|
| 1 | Autor | Home → **New page** | Plantilla + título → `.md` con `status: draft` |
| 2 | Autor | Editor | Escribe; autosave ~300 ms al disco |
| 3 | Autor | Home → **Borradores locales** | Checkbox del lote |
| 4 | Autor | Home | **Mandar a Revisión** → preview → confirmar |
| 5 | Reviewer | GitHub PR | Approves / comenta |
| 6 | Autor | Home → **Feedback recibido** | Abre comentario en el canvas |
| 7 | Autor / merge | Home | **Aprobar y Publicar** cuando el PR esté listo |

### Diagrama de secuencia (staging → PR)

```mermaid
sequenceDiagram
  actor U as Autor
  participant H as Home webview
  participant X as Extension host
  participant GH as GitHub

  U->>H: Selecciona borradores
  U->>H: Mandar a Revisión
  H->>X: previewReview
  X-->>H: reviewPreview (diff corto)
  U->>H: Confirmar Enviar
  H->>X: reviewBatch
  X->>GH: branch review/docs-YYYY-MM + push + PR
  X->>X: YAML status in_review, pr, reviewBranch
  X-->>H: tree (En revisión + inbox)
```

### Frontmatter del ciclo

| Estado | YAML típico | Significado |
|--------|-------------|-------------|
| Borrador | `status: draft` | Solo local / modificado |
| En revisión | `status: in_review` + `pr` + `reviewBranch` | Página en el lote del PR |
| Publicado | `status: published` (sin `pr` / `reviewBranch`) | Mergeado a `defaultBranch` |

---

## 3. Publicar — Workspace

```mermaid
flowchart LR
  A[PR abierto + approvals] --> B{Checks OK?}
  B -->|No| C[UI: checks failing / conflict / needs approval]
  B -->|Sí| D[Home: Aprobar y Publicar]
  D --> E[Host: publishBatch]
  E --> F[GitHub merge]
  F --> G[stampPublishedLocal]
  G --> H[status: published]
```

**Cómo usarlo**

1. No apruebes el merge “a ciegas” desde la extensión: la aprobación de **contenido** sigue siendo en GitHub.
2. Cuando el PR cumple reglas (reviewers, checks), usa **Aprobar y Publicar** en Home.
3. Si está bloqueado, lee el motivo en la tarjeta **En revisión** (`needs approval`, `checks failing`, `conflict`, sin sesión GitHub).

---

## 4. Ciclo Personal

Sin PR. Un solo botón en la barra del editor.

```mermaid
sequenceDiagram
  actor U as Autor
  participant E as Editor
  participant X as Host
  participant GH as GitHub

  U->>E: Edita página
  E->>X: edit (autosave)
  U->>E: Publish
  E->>X: publish
  X->>GH: commit + push a defaultBranch
  X-->>E: status / saved
```

**Cómo usarlo**

- Repo personal o sandbox sin branch protection estricta.
- Si `main` exige PR / bloquea push directo → cambia a **Workspace** o relaja la protección.

---

## 5. Wiki desde el editor → Home (Workspace)

En páginas wiki (`pageKind === wiki`), Review/Publish **no** viven en la barra como flujo completo.

```mermaid
flowchart TD
  U[Clic Revisión en Home en el editor] --> H[wikiHomeActions]
  H --> S[Marca página en staging]
  S --> P[Abre / enfoca Home]
  P --> R[Usuario completa Mandar a Revisión allí]
```

**Cómo usarlo**

- Escribe y guarda en el editor.
- Para el lote: ve a Home (o usa el CTA de la barra que te lleva allí).
- Publicar el merge: solo Home → **Aprobar y Publicar**.

Los sidecars legacy (`.slash.md`) sí pueden Review/Publish desde la barra.

---

## 6. Feedback e inbox

```mermaid
flowchart TD
  PR[Comentarios en PR] --> Badge[Badge Activity Bar]
  Badge --> Inbox[Home: Feedback recibido]
  Inbox --> Open[openInbox]
  Open --> File{¿Archivo en disco?}
  File -->|Sí| Match{¿Branch/PR alineados?}
  Match -->|Sí| Reveal[Editor + highlight snippet]
  Match -->|No| Banner[Banner + Open on GitHub]
  File -->|No| Toast[Toast + Open on GitHub]
```

**Cómo usarlo**

1. No cambies de branch a mano para “ver el comentario”: la extensión **no** hace checkout.
2. Si el banner aparece, el trabajo local no se toca; abre el contexto en GitHub o alinea el PR cuando puedas.
3. Threads sin ancla de texto van al rail **Off canvas** / Unanchored.

---

## 7. Comentarios en el canvas

Solo **Workspace** + página con PR abierto (`in_review` + threads cargables).

```mermaid
flowchart LR
  subgraph Lectura
    M[Mark inline] --> Pop[Popover: leer / Reply / Resolve]
    O[Orphan rail] --> Pop
    O --> GH[Abrir en GitHub]
  end
  subgraph Escritura
    Sel[Seleccionar texto] --> C[Comment]
    C --> Push[Puede pushear a review branch]
    Push --> TH[threadCreate en GitHub]
  end
```

**Cómo usarlo**

| Acción | Uso correcto |
|--------|----------------|
| Click en mark | Leer hilo sin salir del doc |
| Reply / Resolve | Requiere write en el repo |
| Comment desde selección | Puede subir commits pendientes al branch de review primero |
| Personal / sin PR | Comments apagados — no esperes UI de hilos |

---

## 8. Autosave y sync externo

```mermaid
sequenceDiagram
  participant U as Usuario
  participant C as Crepe
  participant S as core/save
  participant H as Host
  participant D as Disco

  U->>C: Escribe
  C->>S: onMarkdown
  S->>H: edit (debounce)
  H->>D: escribe .md
  H-->>C: saved / status

  Note over D,C: Cambio externo (git pull, otro editor)
  D->>H: onDidChangeTextDocument
  H-->>C: setText + frontmatter
```

**Cómo usarlo**

- Confía en el archivo del workspace: es la fuente de verdad.
- No hay “guardar borrador en la nube” aparte de Git/GitHub en Review/Publish.
- Imágenes: van a `{contentPath}/images/` con paths relativos; entran en el lote al mandar a revisión.

---

## 9. Superficies: qué hacer dónde

```mermaid
flowchart TB
  subgraph Home
    T[Árbol / New / carpetas]
    St[Borradores + selección]
    R[Mandar a Revisión]
    P[Aprobar y Publicar]
    I[Inbox feedback]
    Cfg[Config .slashmd.json]
  end
  subgraph Editor
    W[Escribir WYSIWYG]
    M[Icon / cover / frontmatter]
    Th[Threads si hay PR]
    Pe[Publish solo en personal / sidecar]
  end
  T --> W
  St --> R
  R --> Th
  I --> Th
  W --> St
```

| Quiero… | Usar |
|---------|------|
| Crear página / carpeta | Home |
| Escribir y formatear | Editor |
| Armar lote de review | Home → Borradores |
| Ver estado del PR del lote | Home → En revisión |
| Responder un comentario de review | Editor (desde Inbox o marks) |
| Mergear tras approval | Home |
| Push directo (personal) | Editor → Publish |
| Solo editar un `.md` suelto | Open with Slash MD |

---

## 10. Mensajes técnicos (mapa rápido)

Para auditar o extender el código; el detalle está en [ARCHITECTURE.md](ARCHITECTURE.md).

```mermaid
flowchart LR
  subgraph HomeBus
    Hw[homeController] <-->|HomeFrom/ToWebview| Hh[homeMessageRouter]
  end
  subgraph EditorBus
    Ew[editorController + messaging/router] <-->|WebviewToHost / HostToWebview| Eh[editorMessageRouter]
  end
  Hh --> GH[src/github]
  Eh --> GH
  Hh --> WS[src/workspace]
  Eh --> WS
```

| Flujo de producto | Mensajes clave |
|-------------------|----------------|
| Cargar Home | `ready` → `tree` |
| Staging → review | `previewReview` → `reviewPreview` → `reviewBatch` |
| Publicar lote | `publishBatch` |
| Abrir feedback | `openInbox` → `revealThread` / `reviewContext` |
| Autosave | `edit` / `frontmatter` → `saved` |
| Threads | `threadsRefresh` / `threads` / `threadReply` / `threadResolve` |

---

## 11. Anti-patrones

| Evitar | Hacer en su lugar |
|--------|-------------------|
| Esperar Review/Publish completo en la barra del wiki (Workspace) | Usar Home |
| Hacer checkout a mano solo para ver un comentario del inbox | Abrir desde Feedback; usar GitHub si hay mismatch |
| Mezclar páginas de PRs distintos en un solo “Aprobar y Publicar” sin revisar la tarjeta | Un lote / un PR dominante; la UI pide elegir si hay varios |
| Usar Personal con `main` protegido | Workspace, o relajar protección |
| Tratar el sidecar `.slash.md` como el camino feliz nuevo | Wiki `.md` bajo `contentPath` |

---

## 12. Checklist de adopción (equipo)

1. Repo de docs abierto como carpeta + **Init** (`mode: workspace`).
2. Branch protection + reviewers en GitHub.
3. Autor: New page → escribe → Mandar a Revisión.
4. Reviewer: aprueba/comenta en GitHub (y/o threads en canvas).
5. Autor: Inbox → corrige → re-envía al mismo PR si hace falta.
6. **Aprobar y Publicar** → lectores en GitHub / Pages ([READING.md](READING.md)).
