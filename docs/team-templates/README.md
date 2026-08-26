# Team templates (example)

Copy this folder into your docs repo as `templates/` or `<contentPath>/_templates` (default discovery: `templates/`, then `_templates/`). The folder appears in Home’s library so you can open it and create a new template file there.

```
docs/
  _templates/
    _manifest.json    ← optional; file `description:` is enough for the picker
    onboarding.md
    adr.md
    ...
```

Each file is a normal Markdown template. Put a short picker blurb in frontmatter (`description:`). It is shown in **New page** and dropped when creating a wiki page. Slash MD replaces:

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
