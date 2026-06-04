const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trackerAPI", {
  getConfig: () => ipcRenderer.invoke("tracker:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("tracker:save-config", config),
  login: (credentials) => ipcRenderer.invoke("tracker:login", credentials),
  logout: () => ipcRenderer.invoke("tracker:logout"),
  togglePause: () => ipcRenderer.invoke("tracker:toggle-pause"),
  sendSample: () => ipcRenderer.invoke("tracker:send-sample"),
  onStatus: (handler) => {
    const listener = (_event, status) => handler(status);
    ipcRenderer.on("tracker:status", listener);
    return () => ipcRenderer.removeListener("tracker:status", listener);
  }
});
