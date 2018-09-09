const {ipcRenderer} = require("electron");
let messageID = 0;

exports.sendMessageToMain = (msg, callback) => {
  ipcRenderer.send("message", msg);
};

exports.sendAsyncMessageToMain = (msg, callback) => {
  const replyID = messageID;
  ipcRenderer.send("async-message", {
    id: messageID,
    msg: msg
  });
  ipcRenderer.on("reply", (event, data) => {
    if (data.id === replyID) {
      callback(data.msg);
    }
  });
};
