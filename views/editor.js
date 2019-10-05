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
  NestedElementStream,
  nthLayeredChild
} = require("../utils/htmlUtilities");
const contentAction = require("../utils/contentAction");
const { handleKeys } = require("../utils/keyhandling");

let language = "text/plain";
let contentEl = null;
let currentText = "";
let cursorEl = null;
let cursorIndex = null;
let cursorPosition = null;
let tokenBlock = null;

const rehighlight = (startingElementIndex) => {
  tokenBlock = highlight(
    currentText,
    language,
    contentEl,
    startingElementIndex,
    tokenBlock
  );
};

const remove = (elementIndex) => {
  contentEl.removeChild(contentEl.children[elementIndex]);
};

const getElementIndex = (position, limitToBounds = true) => {
  if (position < 0) {
    // Assume that all "out-of-bounds" positions before the start of the code
    // fall in the first element.
    return 0;
  }
  let i;
  for (i = 0; i < tokenBlock.tokens.length; ++i) {
    let nextPosition = tokenBlock.tokens[i].startIndex;
    if (nextPosition > position) {
      return i - 1;
    }
  }
  return i - limitToBounds;
};

const getRelativePosition = (token, position) => {
  return position - token.startIndex;
};

const getContentChildAt = (elementIndex) => {
  return nthLayeredChild(contentEl, elementIndex);
};

const messageQueue = [];
const actions = {
  "cursorTo": (position) => {
    if (cursorEl !== null && position === cursorPosition) { return; }
    if (position < 0) { position = 0; }
    const elementIndex = getElementIndex(position, false);
    const element = getContentChildAt(elementIndex);
    let token = tokenBlock.tokens[elementIndex];
    if (!token && element) {
      // This should only occur when appending to the entire file
      token = new highlight.HighlightedToken(
        "--end-placeholder",
        "--end-placeholder",
        "\n",
        tokenBlock.tokens[elementIndex - 1].startIndex +
          tokenBlock.tokens[elementIndex - 1].text.length,
        false
      );
    }
    const length = element.textContent.length;

    const actualPosition = Math.max(Math.min(
      getRelativePosition(token, position),
      length - 1,
    ), 0);
    cursorIndex = elementIndex;
    cursorPosition = token.startIndex + actualPosition;

    if (cursorEl !== null && cursorEl.parentElement) {
      cursorEl.parentElement.textContent =
        cursorEl.parentElement.textContent;
    }
    cursorEl = document.createElement("span");
    cursorEl.classList.add("cursor");
    let elementText = token.text;
    const character = elementText.charAt(actualPosition);
    cursorEl.textContent = character;
    if (actualPosition === elementText.length - 1) {
      cursorEl.classList.add("final-character");
    }
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
    if (cursorEl === null) {
      cursorTo(0);
    }
    let lineOffset = tokenBlock.tokens[cursorIndex].startIndex;
    for (let i = cursorIndex; i >= 0; --i) {
      if (tokenBlock.tokens[i].startsNewLine) {
        lineOffset -= tokenBlock.tokens[i].startIndex;
        break;
      }
    }
    lineOffset += cursorPosition - tokenBlock.tokens[cursorIndex].startIndex;
    for (let i = cursorIndex + 1; i < tokenBlock.tokens.length; ++i) {
      if (tokenBlock.tokens[i].startsNewLine) {
        actions.cursorTo(tokenBlock.tokens[i].startIndex + lineOffset);
        return;
      }
    }
  },
  "cursorUp": () => {
    if (cursorEl === null) {
      cursorTo(0);
    }
    const cursorOffset = +(cursorIndex >= tokenBlock.tokens.length);
    let token = tokenBlock.tokens[cursorIndex];
    if (!token) {
      // We must be at the end of the file, so move based on the previous
      //  token
      token = new highlight.HighlightedToken(
        "--end-placeholder",
        "--end-placeholder",
        "\n",
        tokenBlock.tokens[cursorIndex - 1].startIndex +
          tokenBlock.tokens[cursorIndex - 1].text.length,
        false
      );
    }
    let lineOffset = token.startIndex;
    let i;
    for (i = cursorIndex - cursorOffset; i >= 0; --i) {
      if (tokenBlock.tokens[i].startsNewLine) {
        lineOffset -= tokenBlock.tokens[i].startIndex;
        break;
      }
    }
    lineOffset += cursorPosition - token.startIndex;
    for (i--; i >= 0; --i) {
      if (i === 0 || tokenBlock.tokens[i].startsNewLine) {
        actions.cursorTo(tokenBlock.tokens[i].startIndex + lineOffset);
        break;
      }
    }
  },
  "cursorLeft": () => {
    actions.cursorTo(cursorPosition - 1);
  },
  "cursorRight": () => {
    actions.cursorTo(cursorPosition + 1);
  },
  "get": (replyID) => {
    const text = currentText;
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
      const token = tokenBlock.tokens[elementIndex];
      const elementPosition = token.startIndex;
      let elementContent = element.textContent;
      const actualPosition = getRelativePosition(token, position);
      elementContent = elementContent.substring(0, actualPosition) + text +
        elementContent.substring(actualPosition);
      element.textContent = token.text = elementContent;
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
    const block = highlight(content, language);
    const html = block.toHTML();
    for (const lineEl of html) {
      contentEl.appendChild(lineEl);
    }
    if (html.length !== 0) {
      const fakeElement = document.createElement("span");
      fakeElement.classList.add("--end-placeholder");
      fakeElement.textContent = "\n";
      html[html.length - 1].appendChild(fakeElement);
    }
    tokenBlock = block;
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
  contentEl.addEventListener("click", (event) => {
    if (event.button === 0) { // Left click
      const colIndex = Array.of(event.target.parentElement.children).indexOf(
        event.target);
      const lineIndex = Array.of(
        event.target.parentElement.parentElement.children).indexOf(
        event.target.parentElement);
      console.log("TODO: Move cursor to line ", lineIndex, " element ", colIndex);
    }
  });
});

handleKeys(window, contentAction);
