// main.js
//
// This file provides the background process for the app. It manages the //  open windows, shows prompts, shows menus, and quits the app when requested.

// Imports
const {app, BrowserWindow, dialog, ipcMain} = require("electron");
const {
  Windows,
  openWindow,
  getWindow,
  getWindows,
  getFocusedWindow,
  sendWindowMessage,
  forceShowWindows,
  forceDestroyWindow
} = require("./utils/window");

app.setName("Naive");

const constants = require("./utils/constants");
const setMenus = require("./utils/menus");
const prefs = new (require("./utils/prefs"))();
require("./utils/aboutPanel").setup();

let attemptingToQuit = false;

// definedMessages contains messages that can be triggered from the renderer
//  process or other parts of the background process to manage windows,
//  or preferences.
const definedMessages = {
  "openPreferences": () => {
    console.log("TODO: Preferences window NYI");
  },
  "openWindow": () => {
    openWindow(Windows.main);
  },
  "forceShowWindows": () => {
    forceShowWindows();
  },
  "resetPreferences": () => {
    prefs.reset();
  },
  "closeThisWindow": (windowID) => {
    // win.destroy() will bypass the beforeunload listener to prevent an
    //  infinite loop. It will also bypass the "close" event (not currently
    //  used) but will NOT bypass the "closed" event.
    forceDestroyWindow(windowID);
  },
  "promptToCloseThisWindow": (windowID) => {
    dialog.showMessageBox(getWindow(windowID), {
      type: "question",
      buttons: ["Cancel", "Don't save"],
      cancelId: 0,
      defaultId: 1,
      message: "Are you sure you want to close this window? You have " +
        "unsaved changes that will be lost",
    }, (response) => {
      const DONT_SAVE = 1;
      if (response === DONT_SAVE) {
        forceDestroyWindow(windowID);
      }
      else {
        attemptingToQuit = false;
      }
    });
  }
};

// asyncMessages contains messages that can be called from other processes and
//  which need a callback.
const asyncMessages = {
  "showOpenDialog": (args, callback) => {
    dialog.showOpenDialog(args, callback);
  },
  "showSaveDialog": (args, callback) => {
    dialog.showSaveDialog(args, callback);
  }
};

// evaluateMessage(msg) - Runs the (non-async) message corresponding to
//  msg.type with an argument of msg.data.
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

// When an asynchronous message is sent from the renderer process, call the
//  appropriate message.
ipcMain.on(constants.asyncMessage, (event, data) => {
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

ipcMain.on(constants.message, (event, data) => {
  evaluateMessage(data);
});

// When the app opens, open the default "main" window and set up the menus.
app.on("ready", () => {
  openWindow(Windows.main);
  setMenus(evaluateMessage);
});

// When all windows are closed, quit the app (unless on MacOS).
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || attemptingToQuit) {
    app.quit();
  }
});

app.on("before-quit", () => {
  attemptingToQuit = true;
});

// When the app icon is clicked, open a window if there is not already one open.
app.on("activate", () => {
  if (getWindows().length === 0) {
    openWindow(Windows.main);
  }
});
