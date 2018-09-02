const {app, BrowserWindow} = require("electron");
const {Windows, openWindow, getWindows} = require("./window");

app.on("ready", () => {
  openWindow(Windows.main);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (getWindow().length === 0) {
    openWindow(Windows.main);
  }
});
