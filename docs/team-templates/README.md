# Team templates (example)

Copy this folder into your docs repo as `<contentPath>/_templates` (default: `docs/_templates`).

```
docs/
  _templates/
    _manifest.json    ← optional labels for the New page picker
    onboarding.md
    adr.md
    ...
```

Each file is a normal Markdown template. Slash MD replaces:

| Placeholder | Value |
|---|---|
| `{{title}}` | Title from the New page prompt |
| `{{owner}}` | Owner when provided |
| `{{date}}` | Today's date (`YYYY-MM-DD`) |

Team templates appear first in **New page** (marked **team**). Same filename as a built-in template (e.g. `spec.md`) overrides the extension default.

Configure a custom folder in `.slashmd.json`:

```json
{
  "templatesPath": "docs/_templates"
}
```

Or set **Templates folder** in Home → **Configurar**.
