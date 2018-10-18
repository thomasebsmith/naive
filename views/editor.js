const require = parent.require.bind(window);

const constants = require("../utils/constants");
const highlight = require("../utils/highlight");
const { htmlFromArray } = require("../utils/htmlUtilities");

let language = "text/plain";
let contentEl = null;
let currentText = "";
let cursorEl = null;
let cursorPosition = null;

const reposition = (startingElementIndex) => {
  let nextIndex = +contentEl.children[startingElementIndex].dataset.startIndex;
  for (let i = startingElementIndex; i < contentEl.children.length; i++) {
    contentEl.children[i].dataset.startIndex = nextIndex;
    nextIndex += contentEl.children[i].textContent.length;
  }
};

const rehighlight = (startingElementIndex) => {
  reposition(startingElementIndex);
  highlight(currentText, language, contentEl, startingElementIndex);
};

const remove = (elementIndex) => {
  contentEl.removeChild(contentEl.children[elementIndex]);
};

const getElementIndex = (position) => {
  let i;
  for (i = 0; i < contentEl.children.length; i++) {
    let nextPosition = +contentEl.children[i].dataset.startIndex;
    if (nextPosition > position) {
      break;
    }
  }
  i--;
  return i;
};

const getRelativePosition = (element, position) => {
  const elementPosition = +element.dataset.startIndex;
  return Math.min(
    position - elementPosition,
    element.textContent.length
  );
};

const messageQueue = [];
const actions = {
  "cursorTo": (position) => {
    if (position === cursorPosition) { return; }
    if (position < 0) { position = 0; }
    const elementIndex = getElementIndex(position);
    const element = contentEl.children[elementIndex];
    const actualPosition = Math.min(
      getRelativePosition(element, position),
      element.textContent.length - 1
    );
    cursorPosition = Math.min(actualPosition + (+element.dataset.startIndex));
    if (cursorEl !== null) {
      cursorEl.parentElement.textContent =
        cursorEl.parentElement.textContent;
    }
    cursorEl = document.createElement("span");
    cursorEl.classList.add("cursor");
    let elementText = element.textContent;
    const character = elementText.charAt(actualPosition);
    cursorEl.textContent = character;
    element.textContent = elementText =
      elementText.substring(0, actualPosition) +
      elementText.substring(actualPosition + 1);
    const range = document.createRange();
    const node = elementText.length === 0 ? element : element.firstChild;
    range.setStart(node, actualPosition);
    range.setEnd(node, actualPosition);
    range.insertNode(cursorEl);
  },
  "cursorLeft": () => {
    actions.cursorTo(cursorPosition - 1);
  },
  "cursorRight": () => {
    actions.cursorTo(cursorPosition + 1);
  },
  "insert": (position, text) => {
    if (contentEl.children.length === 0) {
      actions.set(text);
    }
    else {
      const elementIndex = getElementIndex(position);
      const element = contentEl.children[elementIndex];
      const elementPosition = +element.dataset.startIndex;
      let elementContent = element.textContent;
      const actualPosition = getRelativePosition(element, position);
      elementContent = elementContent.substring(0, actualPosition) + text +
        elementContent.substring(actualPosition);
      element.textContent = elementContent;
      currentText = currentText.substring(0, elementPosition + actualPosition) +
        text + currentText.substring(elementPosition + actualPosition);
      rehighlight(elementIndex);
    }
  },
  "remove": (position, count) => {
    const elementIndex = getElementIndex(position);
    let element = contentEl.children[elementIndex];
    let relativePosition = getRelativePosition(element, position);
    currentText = currentText.substring(0, position) +
                  currentText.substring(position + count);
    let removedChars = 0;
    let elementContent;
    while (removedChars < count && element !== null) {
      elementContent = element.textContent;
      charsToRemove = Math.min(
        count - removedChars, elementContent.length - relativePosition
      );
      element.textContent = elementContent.substring(0, relativePosition) +
                  elementContent.substring(relativePosition + charsToRemove);
      removedChars += charsToRemove;
      relativePosition = 0;
      element = element.nextElementSibling;
    }
    rehighlight(elementIndex);
  },
  "set": (content) => {
    currentText = content;
    contentEl.innerHTML = "";
    htmlFromArray(highlight(content, language), contentEl);
    cursorEl = null;
    actions.cursorTo(0);
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
