const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("erpDesktop", {
  getServer: () => ipcRenderer.invoke("erp:get-server"),
  setServer: (url) => ipcRenderer.invoke("erp:set-server", url),
});
