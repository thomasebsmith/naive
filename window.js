const { BrowserWindow } = require("electron");

let windows = [];

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
    minHeight: type.minHeight
  });
  win.loadFile(type.file);
  let id = windows.push(win) - 1;
  win.on("closed", () => {
    windows[id] = null;
  });
};

exports.getWindows = () => windows.filter(win => win !== null);
