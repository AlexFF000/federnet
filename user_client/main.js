const { app, BrowserWindow } = require('electron');
const path = require("path");

// Hot reload in dev environment
if (process.env.DEV_ENV !== undefined && process.env.DEV_ENV.trim() === "true") {
    console.log("In development mode.  Turning on hot reloading");
    require("electron-reload")("./vue/dist/", {
        awaitWriteFinish: {
            stabilityThreshold: 500  // Wait until file size has remained constant for 200ms before reloading electron, otherwise it can reload while the file is still being written
        }
    })
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, "preload.js"),  
        contextIsolation: true  // Run frontend and backend code in different contexts with no access to one another (except via the context bridge) for security
    }
  });

  win.loadFile('./vue/dist/index.html');

  if (process.platform !== "darwin") {
    win.setMenuBarVisibility(false);  // Hide menu bar at the top
  }
};

if (process.platform === "darwin") {
  app.dock.hide();  // Hide menu bar at the top (on Mac OS)
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handlers for renderer events
require("./handlers.js");