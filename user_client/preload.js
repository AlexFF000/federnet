// Preload script runs before the renderer and backend contexts are isolated from one another, so can be used to set up an API through which they can safely communicate

const { contextBridge, ipcRenderer } = require("electron");

// Expose the following methods in the renderer context as children of the window object
contextBridge.exposeInMainWorld(
    "api",
    {
        "logIn": (infrastructureServer, username, password) => {
            return ipcRenderer.invoke("log-in", infrastructureServer, username, password)
        },
        "createAccount": (infrastructureServer, username, password) => {
            return ipcRenderer.invoke("create-account", infrastructureServer, username, password)
        }
    }
);