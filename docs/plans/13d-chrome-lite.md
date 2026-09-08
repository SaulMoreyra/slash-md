# 13d — Chrome-lite (modo lectura)

**Hecho.**

## Objetivo

Ocultar todo el chrome de escritura en el site web. Todo va detrás de
`isWebHost()` (o de `page.canWrite === false`), así el desktop no cambia.

## Cambios

- `Shell.tsx` — el padding `pt-10` (titlebar Electron) pasa a `pt-3` en web
- `RailNav.tsx` — la sección "My Work" (Inbox/Drafts/Publications) se oculta en web
- `Rail.tsx` — el CTA principal "nueva página" se oculta en web
- `AccountMenu.tsx` — se ocultan New Folder / Config / Refresh / ChangeFolder /
  CloseWorkspace / SignIn / SignOut en web; **se mantienen** identity + footer
  `ThemeSelector`/`LanguageSelector`
- `EditorBlank.tsx` — en web muestra un mensaje vacío en vez del `CreatePageForm`
- `useKeyboardShortcuts.ts` — en web se cortan las write-keys (`⌘N`/`⇧⌘N`/`⌘,`
  `/⌘1-4`/`⇧⌘N`…); **⌘K** y toggles de rail siguen activos
- `EditorMoreActions.tsx` — el botón "Publicar" (personal) se oculta cuando
  `page.canWrite === false`

## Verificación

- Sin "My Work", sin CTA nueva página, sin write-keys, editor `contenteditable=false`
- ⌘K abre búsqueda; toggle de tema persiste
- En la app desktop nada de esto cambia (guards en `isWebHost`)
