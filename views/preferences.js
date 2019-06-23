// TODO: Make buttons and tabs do stuff

const { ipcRenderer } = require("electron");

const constants = require("../utils/constants");
const prefs = new (require("../utils/prefs"))();
const { sendMessageToMain } = require("../utils/rendererMessaging");

let windowID = null;
let loaded = false;

const setStyle = (style, prefix="-") => {
  for (let i in style) {
    if (style.hasOwnProperty(i)) {
      if (typeof style[i] === "object") {
        setStyle(style[i], prefix + i + "-");
      }
      else {
        document.body.style.setProperty("--user" + prefix + i, style[i]);
      }
    }
  }
};

ipcRenderer.on(constants.message, (event, data) => {
  if (data.type === "id") {
    windowID = data.data;
    if (loaded) {
      sendMessageToMain({
        type: "window-loaded",
        data: windowID
      });
    }
  }
  else if (data.type === "shouldClose") {
    sendMessageToMain({
      type: "closeThisWindow",
      data: windowID
    });
  }
  else {
    console.error("Invalid message", data);
  }
});

window.addEventListener("load", () => {
  setStyle(prefs.get("style").content);
  loaded = true;
  if (windowID !== null) {
    sendMessageToMain({
      type: "window-loaded",
      data: windowID
    });
  }
});

const sanitizeToAlphanum = (string) => string.replace(/[^a-zA-Z]/g, "");

document.addEventListener("DOMContentLoaded", () => { 
  const tabsElement = document.querySelector(".tabs");
  tabsElement.addEventListener("click", (event) => {
    const target = event.target;
    if (!target.classList.contains("tab")) {
      return;
    }
    const oldSelectedTabContent =
      document.querySelector(".selected.tab-content");
    oldSelectedTabContent.classList.remove("selected");
    const tabID = sanitizeToAlphanum(target.dataset.tab);
    const contentToSelect =
      document.querySelector(".tab-content[data-tab='" + tabID + "']");
    contentToSelect.classList.add("selected");
  });
});
