window.requireProps = {};

// require(filename) - Emulates the (usually) built-in require function by
//  calling the parent window's require function in a slightly modified way
//  so that the current window is considered to be a separate context.
//  TODO: remove this
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
const { EditingContext } = require("../utils/editingContext");
const { Cursor } = require("../utils/cursor");

let language = "text/plain";
let currentText = "";

let contentEl = null;
let editingContext = null;
let cursor = null;

const rehighlight = (startingElementIndex) => {
  editingContext.tokenBlock = highlight(
    currentText,
    language,
    contentEl,
    startingElementIndex,
    editingContext.tokenBlock
  );
};

const getRelativePosition = (token, position) => {
  return position - token.startIndex;
};

const messageQueue = [];
const actions = {
  "cursorTo": (position) => {
    return cursor.moveTo(position);
  },
  "cursorDown": () => {
    if (cursor.identifier === null) {
      cursor.moveTo(0);
    }
    let lineOffset = cursor.identifier.token.startIndex;
    for (let i = cursor.identifier.index; i >= 0; --i) {
      if (editingContext.tokenBlock.tokens[i] &&
        editingContext.tokenBlock.tokens[i].startsNewLine) {
        lineOffset -= editingContext.tokenBlock.tokens[i].startIndex;
        break;
      }
    }
    lineOffset += (cursor.position - cursor.identifier.token.startIndex);
    for (let i = cursor.identifier.index + 1;
         i < editingContext.tokenBlock.tokens.length; ++i) {
      if (editingContext.tokenBlock.tokens[i].startsNewLine) {
        let j;
        for (j = i + 1; j < editingContext.tokenBlock.tokens.length &&
          !editingContext.tokenBlock.tokens[j].startsNewLine; ++j) {}
        --j;
        let maxCursor = editingContext.tokenBlock.tokens[j].startIndex +
          editingContext.tokenBlock.tokens[j].text.length - 1;
        cursor.moveTo(Math.min(
          editingContext.tokenBlock.tokens[i].startIndex + lineOffset,
          maxCursor
        ));
        return;
      }
    }
  },
  "cursorUp": () => {
    if (cursor.identifier === null) {
      cursorTo(0);
    }
    const cursorOffset = +(
      cursor.identifier.index >= editingContext.tokenBlock.tokens.length
    );
    let token = cursor.identifier.token;
    let lineOffset = token.startIndex;
    let i;
    for (i = cursor.identifier.index - cursorOffset; i >= 0; --i) {
      if (editingContext.tokenBlock.tokens[i].startsNewLine) {
        lineOffset -= editingContext.tokenBlock.tokens[i].startIndex;
        break;
      }
    }
    lineOffset += cursor.position - token.startIndex;
    let tokenLineStart = editingContext.tokenBlock.tokens[i].startIndex;
    for (i--; i >= 0; --i) {
      if (i === 0 || editingContext.tokenBlock.tokens[i].startsNewLine) {
        actions.cursorTo(Math.min(
          editingContext.tokenBlock.tokens[i].startIndex + lineOffset,
          tokenLineStart - 1
        ));
        break;
      }
    }
  },
  "cursorLeft": () => {
    cursor.moveTo(cursor.position - 1);
  },
  "cursorRight": () => {
    cursor.moveTo(cursor.position + 1);
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
      const identifier = editingContext.atPosition(position - 1);
      const elementPosition = identifier.token.startIndex;
      let elementContent = identifier.element.textContent;
      const actualPosition = getRelativePosition(identifier.token, position);
      elementContent = elementContent.substring(0, actualPosition) + text +
        elementContent.substring(actualPosition);
      identifier.element.textContent = identifier.token.text = elementContent;
      currentText = currentText.substring(0, elementPosition + actualPosition) +
        text + currentText.substring(elementPosition + actualPosition);
      rehighlight(identifier.index);
      if (cursor.identifier !== null && cursor.position >= position) {
        cursor.moveBy(text.length);
      }
    }
  },
  "insertAtCursor": (text) => {
    if (cursor.identifier !== null) {
      actions.insert(cursor.position, text);
    }
  },
  "remove": (position, count) => {
    const elementIndex = editingContext.tokenIndexOfPosition(position);
    const stream = new NestedElementStream(editingContext.contentElement);
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
    if (cursor.identifier !== null && position < cursor.position) {
      if (position + count >= cursor.position) {
        cursor.moveTo(position);
      }
      else {
        cursor.moveBy(-count);
      }
    }
  },
  "removeBeforeCursor": (count) => {
    if (cursor.identifier !== null) {
      const removalStartPosition = Math.max(0, cursor.position - count);
      count = cursor.position - removalStartPosition;
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
    editingContext.tokenBlock = block;
    cursor.element = cursor.identifier = cursor.position = null;
    cursor.moveTo(0);
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

const charOffset = (event) => {
  const el = event.target;
  const node = new Text(" ");
  el.appendChild(node);
  const rect = el.getBoundingClientRect();
  const charWidth = rect.width / el.textContent.length;
  const answer = (event.clientX - rect.left) / charWidth;
  el.removeChild(node);
  return Math.floor(answer);
};

document.addEventListener("DOMContentLoaded", () => {
  loaded = true;
  contentEl = document.getElementById("content");
  editingContext = new EditingContext(document, null, contentEl);
  cursor = new Cursor(editingContext);
  for (let i = 0; i < messageQueue.length; i++) {
    evaluateMessage(messageQueue[i]);
  }
  parent.postMessage(constants.contentLoaded, location.origin);
  contentEl.addEventListener("click", (event) => {
    if (event.button === 0) { // Left click
      const colIndex = Array.from(event.target.parentElement.children).indexOf(
        event.target);
      const lineIndex = Array.from(
        event.target.parentElement.parentElement.children).indexOf(
        event.target.parentElement);
      if (event.target.parentElement.parentElement === contentEl) {
        let index = colIndex;
        let line = contentEl.children[lineIndex];
        line = line.previousElementSibling;
        while (line !== null) {
          index += line.childElementCount;
          line = line.previousElementSibling;
        }
        const innerOffset = charOffset(event);
        cursor.moveTo(editingContext.tokenBlock.tokens[index].startIndex +
          innerOffset);
      }
    }
  });
});

handleKeys(window, contentAction);
