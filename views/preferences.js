// TODO: Make buttons and tabs do stuff

const { ipcRenderer } = require("electron");

const constants = require("../utils/constants");
const { sendMessageToMain } = require("../utils/rendererMessaging");

let windowID = null;

ipcRenderer.on(constants.message, (event, data) => {
  if (data.type === "id") {
    windowID = data.data;
    sendMessageToMain({
      type: "window-loaded",
      data: windowID
    });
  }
  else {
    console.error("Invalid message", data);
  }
});
