// utils/rendererMessaging.js
//
// This file provides utilities for sending messages to the /main.js background
//  process.

// Imports
const {ipcRenderer} = require("electron");
let messageID = 0;

// sendMessageToMain(msg) - Sends msg to /main.js.
exports.sendMessageToMain = (msg) => {
  ipcRenderer.send("message", msg);
};

// sendAsyncMessageToMain(msg, callback) - Sends msg to /main.js, waiting
//  for a response. After the response is obtained, callback is called
//  with the replying msg from /main.js.
exports.sendAsyncMessageToMain = (msg, callback) => {
  const replyID = messageID;
  ipcRenderer.send("async-message", {
    id: messageID,
    msg: msg
  });
  ++messageID;
  const listener = (event, data) => {
    if (data.id === replyID) {
      callback(data.msg);
      ipcRenderer.removeListener("reply", listener);
    }
  };

  ipcRenderer.on("reply", listener);
};
