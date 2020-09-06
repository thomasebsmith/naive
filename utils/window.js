// utils/window.js
//
// This file contains a class for handling the windows in an application.

// Imports
const { BrowserWindow, ipcMain } = require("electron");
const isProduction = require("./isProduction");
const constants = require("./constants");

if (!isProduction) {
  console.log("Starting " + constants.appName);
}

// All open windows are stored in the windows array. Messages that have not
//  yet been sent to windows (because the windows have not loaded) are
//  stored in messageQueue.
const windows = [];
const messageQueue = [];

let focusedWindow = null;

// When a valid window-loaded message is received from the renderer process,
//  show the corresponding window. The window is hidden beforehand to prevent
//  users from seeing the window while it is loading.
ipcMain.on(constants.message, (event, data) => {
  if (data.type === "window-loaded") {
    if (windows[data.data]) {
      windows[data.data].show();
    }
    else {
      console.error("Invalid window-loaded message ", data);
    }
  }
});

// An object containing preferences for the default types of windows.
exports.Windows = {
  "main": {
    minWidth: 400,
    minHeight: 100,
    width: 1000,
    height: 800,
    file: "views/main.html",
  },
  "preferences": {
    minWidth: 300,
    minHeight: 100,
    width: 400,
    height: 400,
    file: "views/preferences.html",
    minimizable: false,
    maximizable: false
  },
  "help": {
    minWidth: 250,
    minHeight: 450,
    width: 400,
    height: 800,
    file: "views/help.html"
  }
};

// openWindow(type) - Attempts to open a window based on the information in
//  type. The properties in type correspond to those in exports.Windows
//  objects.
exports.openWindow = (type) => {
  let file = type.file;
  delete type.file;
  let win = new BrowserWindow(Object.assign({
    x: windows.length * 25 + 100,
    y: 0,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true
    },
    show: false // Don't show window until it is loaded
  }, type));
  win.loadFile(file);
  let id = windows.push(win) - 1;
  messageQueue.push([]);
  win.webContents.on("did-finish-load", () => {
    if (messageQueue[id] !== null) {
      for (let msg of messageQueue[id]) {
        win.webContents.send(constants.message, msg);
      }
      messageQueue[id] = null;
    }
  });
  win.on("close", (e) => {
    exports.sendWindowMessage(win, {
      type: "shouldClose"
    });

    // Stop the close until main.js receives a reply from the window.
    e.preventDefault();
  });

  win.on("closed", () => {
    windows[id] = null;
    messageQueue[id] = null;
  });
  exports.sendWindowMessage(win, {
    type: "id",
    data: id
  });
};

// getWindow(id) - Returns the window with the given id.
exports.getWindow = (id) => windows[id];

// getWindows() - Returns all open windows.
exports.getWindows = () => windows.filter(win => win !== null);

// getFocusedWindow() - Returns the focused window.
exports.getFocusedWindow = () => BrowserWindow.getFocusedWindow();

// sendWindowMessage(win, msg) - Sends the message msg to the window win with
//  type "message".
exports.sendWindowMessage = (win, msg) => {
  const id = windows.indexOf(win);
  if (id === -1 || win === null) {
    throw new Error("Invalid window passed to sendMessage");
  }
  if (messageQueue[id] === null) {
    win.webContents.send(constants.message, msg);
  }
  else {
    messageQueue[id].push(msg);
  }
};

// forceDestroyWindow(id) - Forcibly closes the window with id "id". This should
//  only be used once it is confirmed that the user does not have any unsaved
//  changes that they wish to keep.
exports.forceDestroyWindow = (id) => {
  windows[id].destroy();
};

// forceShowWindows() - Forces all windows to appear, even if they have not
//  loaded. This is useful for debugging purposes (a corresponding menu item
//  shows up in debug runs).
exports.forceShowWindows = () => {
  for (let win of windows) {
    win.show();
  }
};
