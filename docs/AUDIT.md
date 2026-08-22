# Auditoría del plan

Fecha: 2026-08-21. Audita [PLAN.md](PLAN.md) y [DECISIONS.md](DECISIONS.md) contra el propósito real del proyecto.

## Propósito declarado

Que una **Product Owner** escriba documentación en GitHub, que los devs la consuman fácil, y tener un **repo entero de documentación** sin pagar una plataforma extra (Notion, GitBook, Confluence), usando lo que GitHub ya ofrece.

## Veredicto

El plan está bien construido, pero estaba optimizado para el usuario equivocado. Todo lo caro —extensión de escritorio, drafts en `globalStorage`, clone local, overlay de comments— asume a un dev en Cursor. La usuaria objetivo es una PO.

**El riesgo número uno del proyecto no es técnico: es adopción.** Si la PO tiene que instalar Cursor, instalar un `.vsix`, configurar `contentRepo` y autenticar GitHub antes de escribir su primer párrafo, la herramienta no se usa.

Se decidió **mantener la extensión de escritorio** asumiendo ese riesgo (ver [Decisiones tomadas](#decisiones-tomadas)).

La parte conceptual del plan es correcta y no cambia: draft ≠ publicado, Review = PR, Markdown que GitHub ya entiende.

## El mismatch, concreto

| Decisión del plan | Realidad de una PO |
|---|---|
| Extensión de VS Code / Cursor | No tiene el IDE ni quiere instalarlo |
| Drafts en `globalStorage` | Cambia de máquina; el borrador se queda en una sola |
| Clone local + `git push` | git no está en su modelo mental |
| Wizard de settings (`contentRepo`, `contentPath`) | Configuración de dev |
| `.vsix` sin Marketplace | Distribución manual a cada persona no técnica |

## Lo que sobrevive intacto

- Separar **borrador** de **publicado**. Es el corazón del producto.
- **Review = rama + PR**; re-Review actualiza la misma rama.
- Callouts `> [!NOTE]` y toggles `<details>`: Markdown que GitHub renderiza solo.
- **Sin block ids** (`<!-- block:id -->`) en el archivo.
- El **gate de round-trip** (fase 2) antes de tocar git. Sigue siendo la mejor decisión del plan.
- Repo de contenido dedicado, separado del repo de código.

## Lo que cambia

### 1. Publish ya no es "push a `main`"

Con repo privado en plan pagado se activan **branch protection** y **required reviewers**. Con `main` protegida, un push directo **es rechazado por GitHub**. `allowDirectPublish` solo funcionaría para quien tenga bypass de admin, que es justo lo que no queremos para docs revisadas por devs.

**Publish pasa a significar "mergear el PR"**, y "push rechazado por protección de rama" se trata como estado de primera clase en la barra, no como error genérico.

### 2. Falta el "repo entero de documentación"

El plan era **documento-céntrico**: un draft a la vez. Un repo de docs necesita cosas que no estaban en ninguna fase:

- Navegación: árbol de carpetas, índice, "crear doc dentro de esta sección"
- Mover y renombrar sin romper links relativos
- **Frontmatter** (`title`, `owner`, `status`, `updated`): lo que hace la docs auditable
- **Plantillas** (PRD, spec, decisión): una PO con plantilla produce docs consistentes; con lienzo en blanco, no
- Búsqueda entre documentos

Añadido al plan como fase 0.5 (config del repo, sin código) y ampliación de la fase 6.

### 3. Prioridades dentro de los bloques

Lo que desbloquea a una PO es `/h1`, listas, tablas e **imágenes que se pegan sin miedo**. `/toggle` y `/callout` son adorno comparados con eso. Bajan de prioridad dentro de la fase 6.

## Lo que se recomendó diferir (riesgo aceptado)

**Fase 8 (comments flotando).** Es la parte más caras del plan —anclaje por snippet, fuzzy match, decorations, huérfanos— y es justo lo que GitHub ya da gratis en la pestaña del PR. Para una PO, leer y responder en github.com es natural.

Se mantiene en el plan por decisión explícita, pero **después** de que Review y Publish funcionen. No es v1 crítico.

## Chequeo de costes: qué es gratis de verdad

Verificado en la [documentación de planes de GitHub](https://docs.github.com/en/get-started/learning-about-github/githubs-plans):

| Lo que queremos | Plan Free |
|---|---|
| Repo privado, colaboradores ilimitados | Sí |
| PRs, review comments, sugerencias | Sí |
| **Branch protection, required reviewers, CODEOWNERS** en repo **privado** | **No** — requiere Pro (personal) o Team (org) |
| GitHub Pages desde repo **privado** | **No** — requiere Pro/Team |
| Sitio de Pages **privado** (solo el equipo) | **No** — solo Enterprise Cloud |
| Leer los `.md` en el repo o en el IDE | Sí, siempre |

**Decisión del proyecto:** repo **privado con plan pagado** (Team/Pro) para poder *forzar* la revisión. Sigue siendo mucho más barato que Notion/GitBook por usuario.

Los devs no necesitan Pages: GitHub renderiza Markdown en el repo, y en el IDE lo leen en crudo. Un sitio (MkDocs/Pages) queda como opcional futuro.

## Superficies evaluadas

| Superficie | Instalación para la PO | Publish/Review | Coste de construir |
|---|---|---|---|
| GitHub tal cual (editor web + preview + draft PR) | Cero | Ya existe | Cero código |
| Extensión **web** en `github.dev` | Cero (`.com` → `.dev`) | Vía API de GitHub | Medio |
| CMS git en una página (tipo Sveltia) | Cero (una URL) | Ya implementado | Bajo (config) |
| **Extensión de escritorio** ← elegida | Alta | Según el plan | Alto |

Notas de la investigación:

- **`github.dev`**: una extensión ahí corre en un Web Worker. **Sin Node, sin `child_process`, sin git local, sin `gh` CLI** ([web extensions](https://code.visualstudio.com/api/extension-guides/web-extensions)). Invalidaría la decisión "clone local, no Contents API", pero el login a GitHub es automático y la instalación es cero.
- **[Sveltia CMS](https://sveltiacms.app/en/docs/workflows/editorial)**: open source; su editorial workflow ya hace lo que diseñamos (rama `cms/<colección>/<slug>`, un PR por documento, publicar = mergear). Se sirve desde Pages y necesita un OAuth client en el free tier de Cloudflare. Límite: es un CMS de campos y colecciones, no un canvas con `/h1`.

## Decisiones tomadas

1. **Mantener la extensión de escritorio** (plan actual), asumiendo el riesgo de adopción.
2. **Repo privado con plan pagado** (Team/Pro) para forzar revisión vía branch protection + CODEOWNERS.
3. Publish = **merge del PR**, no push a `main`.
4. Añadir la capa de "repo de documentación" (estructura, frontmatter, plantillas, navegación).
5. Comments (fase 8) después de Review y Publish.

## Mitigación del riesgo de adopción

Como no se eligió el experimento de validación previo, conviene al menos:

- **Onboarding de un clic**: `.vsix` + instrucciones de una página, o publicar en Marketplace para que se instale por nombre.
- **Cero configuración para la PO**: el `contentRepo` debería venir preconfigurado (settings de workspace commiteados, no wizard por usuario).
- **Checkpoint honesto en la fase 4**: cuando Review cree su primer PR, sentar a la PO a escribir un doc real. Si ahí no lo usa, el problema es la superficie, no las features — y toca reconsiderar `github.dev` antes de invertir en las fases 6–8.

## Recomendación no aplicada (queda registrada)

Una **fase -1 de validación** (una semana, casi sin código): montar el repo de docs con plantillas, `CODEOWNERS`, PR template y lint, y pedirle a la PO que escriba un documento real con el editor web de GitHub. Observar dónde se traba:

- Se traba en la **sintaxis** → la respuesta es WYSIWYG en el navegador (`github.dev` o CMS)
- Se traba en el **flujo** (ramas, PRs, merge) → esconder git detrás de dos botones; el editor importa menos
- No se traba → ya está resuelto, gratis

Ese experimento cuesta una semana y decide correctamente una inversión de meses. Sigue siendo la vía más barata si la fase 4 revela problemas de adopción.
