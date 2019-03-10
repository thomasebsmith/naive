const { BrowserWindow, ipcMain } = require("electron");

const isProduction = require("./isProduction");
const constants = require("./constants");
if (!isProduction) {
  console.log("Starting " + constants.appName);
}

const windows = [];
const messageQueue = [];
let focusedWindow = null;

ipcMain.on("message", (event, data) => {
  if (data.type === "window-loaded") {
    if (windows[data.data]) {
      windows[data.data].show();
    }
    else {
      console.error("Invalid window-loaded message ", data);
    }
  }
});

exports.Windows = {
  "main": {
    minWidth: 400,
    minHeight: 100,
    width: 1000,
    height: 800,
    file: "views/main.html",
  }
};

exports.openWindow = (type) => {
  let win = new BrowserWindow({
    width: type.width,
    height: type.height,
    minWidth: type.minWidth,
    minHeight: type.minHeight,
    show: false // Don't show window until it is loaded
  });
  win.loadFile(type.file);
  let id = windows.push(win) - 1;
  messageQueue.push([]);
  win.webContents.on("did-finish-load", () => {
    if (messageQueue[id] !== null) {
      for (let msg of messageQueue[id]) {
        win.webContents.send("message", msg);
      }
      messageQueue[id] = null;
    }
  });
  win.on("beforeunload", (e) => {
    exports.sendWindowMessage(win, {
      type: "shouldClose"
    });

    // Stop the close until main.js receives a reply from the window.
    e.returnValue = false;
    return false;
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

exports.getWindows = () => windows.filter(win => win !== null);

exports.getFocusedWindow = () => BrowserWindow.getFocusedWindow();

exports.sendWindowMessage = (win, msg) => {
  const id = windows.indexOf(win);
  if (id === -1 || win === null) {
    throw new Error("Invalid window passed to sendMessage");
  }
  if (messageQueue[id] === null) {
    win.webContents.send("message", msg);
  }
  else {
    messageQueue[id].push(msg);
  }
};

exports.forceShowWindows = () => {
  for (let win of windows) {
    win.show();
  }
};
