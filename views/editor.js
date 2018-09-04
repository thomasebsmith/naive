const require = parent.require.bind(window);

const constants = require("../constants");
const highlight = require("../highlight");
const { htmlFromArray } = require("../htmlUtilities");

let language = "text/plain";
let contentEl = null;

const messageQueue = [];
const actions = {
  "set": (content) => {
    contentEl.innerHTML = "";
    htmlFromArray(highlight(content, language), contentEl);
  },
  "setLanguage": (lang) => {
    language = lang;
  },
  "setStyle": (style, prefix="-") => {
    for (let i in style) {
      if (style.hasOwnProperty(i)) {
        if (typeof style[i] === "object") {
          actions.setStyle(style[i], prefix + i + "-");
        }
        else {
          document.body.style.setProperty("--user" + prefix + i, style[i]);
        }
      }
    }
  }
};
const evaluateMessage = (data) => {
  return actions[data.action].apply(actions, data.args);
};

window.addEventListener("message", (event) => {
  if (event.origin === location.origin && event.source === window.parent) {
    if (!loaded) {
      messageQueue.push(event.data);
    }
    else {
      evaluateMessage(event.data);
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loaded = true;
  contentEl = document.getElementById("content");
  for (let i = 0; i < messageQueue.length; i++) {
    evaluateMessage(messageQueue[i]);
  }
  parent.postMessage(constants.contentLoaded, location.origin);
});
