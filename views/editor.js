const require = parent.require.bind(window);

const constants = require("../utils/constants");
const highlight = require("../utils/highlight");
const { htmlFromArray } = require("../utils/htmlUtilities");

let language = "text/plain";
let contentEl = null;
let currentText = "";

const reposition = (startingElementIndex) => {
  let nextIndex = startingElementIndex.dataset.filePosition;
  for (let i = startingElementIndex; i < contentEl.children.length; i++) {
    contentEl.children[i].dataset.filePosition = nextIndex;
    nextIndex += contentEl.children[i].textContent.length;
  }
};

const rehighlight = (startingElementIndex) => {
  highlight(currentText, language, contentEl, startingElementIndex);
  reposition(startingelementIndex);
};

const messageQueue = [];
const actions = {
  "insert": (position, text) => {
    if (contentEl.children.length === 0) {
      actions.set(text);
    }
    else {
      let i;
      for (i = 0; i < contentEl.children.length; i++) {
        let nextPosition = contentEl.children.dataset.filePosition;
        if (nextPosition > position) {
          break;
        }
      }
      i--; // Now contentEl.children[i] should be the element to insert into
      let element = contentEl.children[i];
      let elementPosition = element.dataset.filePosition;
      let elementContent = element.textContent;
      let actualPosition = Math.min(
        position - elementPosition,
        elementContent.length
      );
      elementContent = elementContent.substring(0, actualPosition) + text +
        elementContent.substring(actualPosition);
      element.textContent = elementContent;
      rehighlight(i);
      currentText = currentText.substring(0, elementPosition + actualPosition) +
        text + currentText.substring(elementPosition + actualPosition);
    }
  },
  "set": (content) => {
    currentText = content;
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
