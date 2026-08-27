import { app, BrowserWindow, Menu, shell } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import { APP_NAME, DOCS_URL, ISSUES_URL } from "../shared/brand";
import { MenuAction, menuCopy, menuLocale } from "../shared/menu";
import { closeOpenFolder, pickAndOpenFolder } from "./folders";

export function registerAppMenu(getWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === "darwin";
  const isDev = !app.isPackaged;
  const copy = menuCopy(menuLocale(app.getLocale()));
  const send = (action: MenuAction) => {
    getWindow()?.webContents.send("menu-action", action);
  };

  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: copy.openFolder,
      accelerator: "CmdOrCtrl+O",
      click: () => {
        void pickAndOpenFolder(getWindow());
      },
    },
    {
      label: copy.closeFolder,
      click: () => closeOpenFolder(getWindow()),
    },
    { type: "separator" },
    {
      label: copy.newPage,
      accelerator: "CmdOrCtrl+N",
      click: () => send(MenuAction.NewPage),
    },
    {
      label: copy.newFolder,
      accelerator: "CmdOrCtrl+Shift+N",
      click: () => send(MenuAction.NewFolder),
    },
    { type: "separator" },
    {
      label: copy.closePage,
      accelerator: "CmdOrCtrl+W",
      click: () => send(MenuAction.ClosePage),
    },
  ];

  if (isMac) {
    fileSubmenu.push({
      label: copy.closeWindow,
      role: "close",
      accelerator: "CmdOrCtrl+Shift+W",
    });
  } else {
    fileSubmenu.push(
      { type: "separator" },
      {
        label: copy.settings,
        accelerator: "CmdOrCtrl+,",
        click: () => send(MenuAction.Settings),
      },
      { type: "separator" },
      { role: "quit" },
    );
  }

  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: APP_NAME,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: copy.settings,
          accelerator: "CmdOrCtrl+,",
          click: () => send(MenuAction.Settings),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  template.push({ label: copy.file, submenu: fileSubmenu });

  template.push({
    label: copy.edit,
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { role: "selectAll" },
      { type: "separator" },
      {
        label: copy.search,
        accelerator: "CmdOrCtrl+K",
        click: () => send(MenuAction.Search),
      },
      ...(isMac
        ? ([
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ] satisfies MenuItemConstructorOptions[])
        : []),
    ],
  });

  template.push({
    label: copy.view,
    submenu: [
      ...(isDev
        ? ([
            { role: "reload" },
            { role: "toggleDevTools" },
            { type: "separator" },
          ] satisfies MenuItemConstructorOptions[])
        : []),
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
      { type: "separator" },
      {
        label: copy.toggleWorkPane,
        accelerator: "CmdOrCtrl+\\",
        click: () => send(MenuAction.ToggleWorkPane),
      },
      {
        label: copy.toggleRail,
        accelerator: "CmdOrCtrl+Shift+\\",
        click: () => send(MenuAction.ToggleRail),
      },
      {
        label: copy.refresh,
        accelerator: "CmdOrCtrl+Shift+R",
        click: () => send(MenuAction.Refresh),
      },
    ],
  });

  template.push({
    label: copy.window,
    role: "windowMenu",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? ([
            { type: "separator" },
            { role: "front" },
          ] satisfies MenuItemConstructorOptions[])
        : ([{ role: "close" }] satisfies MenuItemConstructorOptions[])),
    ],
  });

  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: copy.documentation,
      click: () => {
        void shell.openExternal(DOCS_URL);
      },
    },
    {
      label: copy.reportIssue,
      click: () => {
        void shell.openExternal(ISSUES_URL);
      },
    },
  ];
  if (!isMac) {
    helpSubmenu.unshift({ role: "about" }, { type: "separator" });
  }

  template.push({
    label: copy.help,
    role: "help",
    submenu: helpSubmenu,
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
