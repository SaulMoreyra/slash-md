export enum MenuAction {
  NewPage = "newPage",
  NewFolder = "newFolder",
  Search = "search",
  FindInPage = "findInPage",
  Settings = "settings",
  ToggleWorkPane = "toggleWorkPane",
  ToggleRail = "toggleRail",
  ClosePage = "closePage",
  Refresh = "refresh",
}

export type MenuLocale = "en" | "es";

export function menuLocale(osLocale: string): MenuLocale {
  return osLocale.toLowerCase().startsWith("es") ? "es" : "en";
}

export type MenuCopy = {
  file: string;
  edit: string;
  view: string;
  window: string;
  help: string;
  openFolder: string;
  closeFolder: string;
  closePage: string;
  closeWindow: string;
  newPage: string;
  newFolder: string;
  search: string;
  findInPage: string;
  settings: string;
  toggleWorkPane: string;
  toggleRail: string;
  refresh: string;
  documentation: string;
  reportIssue: string;
};

const EN: MenuCopy = {
  file: "File",
  edit: "Edit",
  view: "View",
  window: "Window",
  help: "Help",
  openFolder: "Open Folder…",
  closeFolder: "Close Folder",
  closePage: "Close Page",
  closeWindow: "Close Window",
  newPage: "New Page",
  newFolder: "New Folder",
  search: "Search",
  findInPage: "Find in Page",
  settings: "Settings…",
  toggleWorkPane: "Toggle Work List",
  toggleRail: "Toggle Navigation",
  refresh: "Refresh Workspace",
  documentation: "Documentation",
  reportIssue: "Report Issue",
};

const ES: MenuCopy = {
  file: "Archivo",
  edit: "Edición",
  view: "Visualización",
  window: "Ventana",
  help: "Ayuda",
  openFolder: "Abrir carpeta…",
  closeFolder: "Cerrar carpeta",
  closePage: "Cerrar página",
  closeWindow: "Cerrar ventana",
  newPage: "Nueva página",
  newFolder: "Nueva carpeta",
  search: "Buscar",
  findInPage: "Buscar en la página",
  settings: "Configuración…",
  toggleWorkPane: "Mostrar lista de trabajo",
  toggleRail: "Mostrar navegación",
  refresh: "Actualizar workspace",
  documentation: "Documentación",
  reportIssue: "Reportar un problema",
};

export function menuCopy(locale: MenuLocale): MenuCopy {
  return locale === "es" ? ES : EN;
}
