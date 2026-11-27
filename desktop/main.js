// Dev Squad ERP desktop client.
// It is a thin window around the ERP web app. All business logic stays on the server.
// The server address is chosen by the user and stored in the user's profile folder.
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

const CONFIG = () => path.join(app.getPath("userData"), "config.json");
let win = null;

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG()), { recursive: true });
  fs.writeFileSync(CONFIG(), JSON.stringify(cfg, null, 2), "utf8");
}

// Only plain http(s) origins are accepted. No credentials in the URL.
function normalizeUrl(input) {
  let value = String(input || "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = "http://" + value;
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || !u.hostname) return null;
  return u.origin + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
}

function sameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function showServerPage(message) {
  if (!win) return;
  win.loadFile(path.join(__dirname, "server.html"), {
    query: { current: readConfig().serverUrl || "", message: message || "" },
  });
}

function openServer() {
  const url = readConfig().serverUrl;
  if (!url) return showServerPage();
  win.loadURL(url).catch(() => {});
}

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "ERP",
        submenu: [
          { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win && win.webContents.reload() },
          { label: "Change server address", click: () => showServerPage() },
          { type: "separator" },
          { label: "Zoom in", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
          { label: "Zoom out", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
          { label: "Reset zoom", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
          { label: "Full screen", accelerator: "F11", role: "togglefullscreen" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
    ]),
  );
}

function createWindow() {
  const state = readConfig().window || {};
  win = new BrowserWindow({
    width: state.width || 1280,
    height: state.height || 800,
    minWidth: 900,
    minHeight: 600,
    title: "Dev Squad ERP",
    backgroundColor: "#0b0f17",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Links to other sites open in the normal browser, never inside the ERP window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    const server = readConfig().serverUrl;
    if (server && sameOrigin(url, server)) return { action: "allow" };
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const server = readConfig().serverUrl;
    const local = url.startsWith("file://");
    if (!local && !(server && sameOrigin(url, server))) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = aborted
    showServerPage(`Could not reach the server (${desc}). Check the address and the network, then try again.`);
  });
  win.on("close", () => {
    const b = win.getBounds();
    const cfg = readConfig();
    writeConfig({ ...cfg, window: { width: b.width, height: b.height } });
  });

  buildMenu();
  openServer();
}

ipcMain.handle("erp:get-server", () => readConfig().serverUrl || "");
ipcMain.handle("erp:set-server", (_e, input) => {
  const url = normalizeUrl(input);
  if (!url) return { ok: false, error: "Enter a valid address such as http://192.168.1.5:8080" };
  writeConfig({ ...readConfig(), serverUrl: url });
  openServer();
  return { ok: true };
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
  app.on("window-all-closed", () => app.quit());
}
