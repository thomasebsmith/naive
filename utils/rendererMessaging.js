// utils/rendererMessaging.js
//
// This file provides utilities for sending messages to the /main.js background
//  process.

// Imports
const {ipcRenderer} = require("electron");
const constants = require("./constants");
let messageID = 0;

// sendMessageToMain(msg) - Sends msg to /main.js.
exports.sendMessageToMain = (msg) => {
  ipcRenderer.send(constants.message, msg);
};

// sendAsyncMessageToMain(msg, callback) - Sends msg to /main.js, waiting
//  for a response. After the response is obtained, callback is called
//  with the replying msg from /main.js.
exports.sendAsyncMessageToMain = (msg, callback) => {
  const replyID = messageID;
  ipcRenderer.send(constants.asyncMessage, {
    id: messageID,
    msg: msg
  });
  ++messageID;
  const listener = (event, data) => {
    if (data.id === replyID) {
      callback(data.msg);
      ipcRenderer.removeListener(constants.reply, listener);
    }
  };

  ipcRenderer.on(constants.reply, listener);
};
