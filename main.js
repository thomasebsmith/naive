const {app, BrowserWindow, dialog, ipcMain} = require("electron");
const {
  Windows,
  openWindow,
  getWindows,
  getFocusedWindow,
  sendWindowMessage,
  forceShowWindows
} = require("./utils/window");
const setMenus = require("./utils/menus");
const prefs = new (require("./utils/prefs"))();

const definedMessages = {
  "openWindow": () => {
    openWindow(Windows.main);
  },
  "forceShowWindows": () => {
    forceShowWindows();
  },
  "resetPreferences": () => {
    prefs.reset();
  }
};

const asyncMessages = {
  "showOpenDialog": (args, callback) => {
    dialog.showOpenDialog(args, callback);
  },
  "showSaveDialog": (args, callback) => {
    dialog.showSaveDialog(args, callback);
  }
};

const evaluateMessage = (msg) => {
  if (definedMessages.hasOwnProperty(msg.type)) {
    definedMessages[msg.type](msg.data);
  }
  else {
    const focusedWindow = getFocusedWindow();
    if (focusedWindow === null) {
      // TODO: Ignored currently. Ideally disable ability to reach this point.
    }
    else {
      sendWindowMessage(focusedWindow, msg);
    }
  }
};

ipcMain.on("async-message", (event, data) => {
  if (asyncMessages.hasOwnProperty(data.msg.type)) {
    asyncMessages[data.msg.type](data.msg.data, (msg) => {
      event.sender.send("reply", {
        id: data.id,
        msg: msg
      });
    });
  }
  else {
    console.error("Invalid async message ", data);
  }
});

app.on("ready", () => {
  openWindow(Windows.main);
  setMenus(evaluateMessage);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (getWindows().length === 0) {
    openWindow(Windows.main);
  }
});
