window.requireProps = {};

// require(filename) - Emulates the (usually) built-in require function by
//  calling the parent window's require function in a slightly modified way
//  so that the current window is considered to be a separate context.
const require = (filename) => {
  const parentRequire = parent.require;
  const absolutePath = parentRequire.resolve(filename);
  let result;
  const oldIsEditor = parent.isEditor;
  const oldEditorWindow = parent.editorWindow;
  parent.isEditor = true;
  parent.editorWindow = window;
  if (parentRequire.cache[absolutePath]) {
    const cachedModule = parentRequire.cache[absolutePath];
    parentRequire.cache[absolutePath] = undefined;
    result = parentRequire.call(window, filename);
    parentRequire.cache[absolutePath] = cachedModule;
  }
  else {
    result = parentRequire.call(window, filename);
    parentRequire.cache[absolutePath] = undefined;
  }
  parent.isEditor = oldIsEditor;
  parent.editorWindow = oldEditorWindow;
  return result;
};

// Imports
const constants = require("../utils/constants");
const highlight = require("../utils/highlight");
const {
  htmlFromArray,
  HighlightedStream,
  NestedElementStream
} = require("../utils/htmlUtilities");
const contentAction = require("../utils/contentAction");
const { handleKeys } = require("../utils/keyhandling");

let language = "text/plain";
let contentEl = null;
let currentText = "";
let cursorEl = null;
let cursorPosition = null;

const reposition = (startingElementIndex) => {
  const stream = new NestedElementStream(contentEl);
  for (let i = 0; i < startingElementIndex; ++i) {
    stream.next();
  }
  let nextIndex = +stream.peek().dataset.startIndex;
  while (stream.hasNext) {
    stream.peek().dataset.startIndex = nextIndex;
    nextIndex += stream.peek().textContent.length;
    stream.next();
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
  if (position < 0) {
    // Assume that all "out-of-bounds" positions before the start of the code
    // fall in the first element.
    return 0;
  }
  const stream = new HighlightedStream(contentEl);
  let i = 0;
  while (stream.hasNext) {
    let nextPosition = stream.next().startIndex;
    if (nextPosition > position) {
      return i - 1;
    }
    ++i;
  }
  return i - 1;
};

const getRelativePosition = (element, position) => {
  const elementPosition = +element.dataset.startIndex;
  return Math.min(
    position - elementPosition,
    element.textContent.length
  );
};

const getContentChildAt = (elementIndex) => {
  const stream = new NestedElementStream(contentEl);
  for (let i = 0; i < elementIndex; ++i) {
    stream.next();
  }
  return stream.peek();
};

const messageQueue = [];
const actions = {
  "cursorTo": (position) => {
    if (position === cursorPosition) { return; }
    if (position < 0) { position = 0; }
    const elementIndex = getElementIndex(position);
    const element = getContentChildAt(elementIndex);
    const actualPosition = Math.max(Math.min(
      getRelativePosition(element, position),
      element.textContent.length - 1,
    ), 0);
    cursorPosition = Math.min(actualPosition + (+element.dataset.startIndex));
    if (cursorEl !== null && cursorEl.parentElement) {
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
  "cursorDown": () => {
    const currentLineEl = cursorEl.parentElement.parentElement;
    const nextLineEl = currentLineEl.nextSibling;
    // TODO: Use previous offset for next line.
    const startIndex = +currentLineEl.lastChild.dataset.startIndex +
      currentLineEl.lastChild.textContent.length;
    actions.cursorTo(startIndex);
  },
  "cursorLeft": () => {
    actions.cursorTo(cursorPosition - 1);
  },
  "cursorRight": () => {
    actions.cursorTo(cursorPosition + 1);
  },
  "get": (replyID) => {
    const text = contentEl.textContent;
    parent.postMessage({
      replyID: replyID,
      result: text,
      type: constants.reply
    }, location.origin);
  },
  "insert": (position, text) => {
    if (contentEl.children.length === 0) {
      actions.set(text);
    }
    else {
      const elementIndex = getElementIndex(position - 1);
      const element = getContentChildAt(elementIndex);
      const elementPosition = +element.dataset.startIndex;
      let elementContent = element.textContent;
      const actualPosition = getRelativePosition(element, position);
      elementContent = elementContent.substring(0, actualPosition) + text +
        elementContent.substring(actualPosition);
      element.textContent = elementContent;
      currentText = currentText.substring(0, elementPosition + actualPosition) +
        text + currentText.substring(elementPosition + actualPosition);
      rehighlight(elementIndex);
      if (cursorPosition !== null && cursorPosition >= position) {
        actions.cursorTo(cursorPosition + text.length);
      }
    }
  },
  "insertAtCursor": (text) => {
    if (cursorPosition !== null) {
      actions.insert(cursorPosition, text);
    }
  },
  "remove": (position, count) => {
    const elementIndex = getElementIndex(position);
    const stream = new NestedElementStream(contentEl);
    for (let i = 0; i < elementIndex; ++i) {
      stream.next();
    }
    let element = stream.peek();
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
      element = stream.next();
    }
    rehighlight(elementIndex);
    if (cursorPosition !== null && position < cursorPosition) {
      if (position + count >= cursorPosition) {
        actions.cursorTo(position);
      }
      else {
        actions.cursorTo(cursorPosition - count);
      }
    }
  },
  "removeBeforeCursor": (count) => {
    if (cursorPosition !== null) {
      const removalStartPosition = Math.max(0, cursorPosition - count);
      count = cursorPosition - removalStartPosition;
      actions.remove(removalStartPosition, count);
    }
  },
  "set": (content) => {
    currentText = content;
    contentEl.innerHTML = "";
    const tokens = highlight(content, language);
    let lineEl;
    for (let line of tokens) {
      lineEl = document.createElement("span");
      lineEl.classList.add("line");
      htmlFromArray(line, lineEl);
      contentEl.appendChild(lineEl);
    }
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
requireProps.actions = actions;
const evaluateMessage = (data) => {
  return contentAction(data.action, ...data.args);
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

handleKeys(window, contentAction);
