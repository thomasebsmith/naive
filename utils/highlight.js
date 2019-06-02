// utils/highlight.js
//
// This file provides utilities for generating syntax-highlighted HTML based
//  on a mime type and some text.

// Imports
const fs = require("fs");
const path = require("path");
const { htmlFromArray, HighlightedStream } = require("../utils/htmlUtilities");

const highlighterDirectory = "../highlighters/";

// Mime types
const highlighters = {
  "application/javascript": "javascript",
  "text/css": "css",
  "text/html": "html",
  "text/markdown": "markdown",
  "text/plain": "text",
  "text/x-c-source": "c",
  "text/x-cplusplus-source": "cpp"
};

const highlighterFormattedKey = {};
const defaultTokenType = {
  breakOn: /[\s\S]/y,
  className: "plain"
};

class HighlightedToken {
  constructor(tokenType, text, startIndex) {
    this.tokenType = tokenType;
    this.text = text;
    this.startIndex = startIndex;
  }
  equals(other) {
    return this.contentEquals(other) && this.startIndex === other.startIndex;
  }
  contentEquals(other) {
    return this.tokenType === other.tokenType &&
           this.text === other.text;
  }
  toHTML() {
    return this.text.split("\n").map((line) => {
      const element = document.createElement("span");
      element.dataset.tokenType = this.tokenType;
      element.textContent = this.text;
      return element;
    });
  }
};

class HighlightedBlock {
  constructor() {
    this.tokens = [];
  }
  appendToken(token) {
    this.tokens.push(token);
  }
  toHTML() {
    const lineEl = document.createElement("span");
    lineEl.classList.add("line");
    let lines = [lineEl];
    let html;
    for (const token of this.tokens) {
      html = token.toHTML();
      if (html.length === 1) {
        lines[lines.length - 1].appendChild(html[0]);
      }
      else if (html.length > 1) {
        lines[lines.length - 1].appendChild(html[0]);
        for (let i = 1; i < html.length; ++i) {
          lineEl = document.createElement("span");
          lineEl.classList.add("line");
          lineEl.appendChild(html[i]);
          lines.push(lineEl);
        }
      }
    }
    return lines;
  }
  slice(startIndex = 0, endIndex = this.tokens.length) {
    const theSlice = new HighlightedBlock();
    for (let i = startIndex; i < endIndex; ++i) {
      theSlice.appendToken(this.tokens[i]);
    }
    return theSlice;
  }
  // Returns a pair [startIndex, lastIndex] such that the range of indices
  //  [startIndex, lastIndex) in this HighlightedBlock contains all differences
  //  between this block and the blockToCompare. Returns null if there are no
  //  differences.
  changedRange(blockToCompare) {
    let startIndex = 0;
    let differencesFound = false;
    while (startIndex < this.tokens.length &&
           startIndex < blockToCompare.tokens.length) {
      if (!this.tokens[startIndex].contentEquals(
           blockToCompare.tokens[startIndex])) {
        differencesFound = true;
        break;
      }
      ++startIndex;
    }
    if (!differencesFound) {
      return null;
    }
    let endOffset = 0;
    while (this.tokens[this.tokens.length - endOffset - 1].contentEquals(
        blockToCompare.tokens[blockToCompare.tokens.length - endOffset - 1])) {
      ++endOffset;
    }
    return [startIndex, this.tokens.length - endOffset];
  }
    
  // firstTokenElement is the first element that overlaps with the given
  //  HighlightedBlock. It should be a *token* element, not a line element.
  // countToReplace is the number of HTML token elements that should be
  //  replaced (the elements are replaced with elements corresponding to *all*
  //  the elements in this HighlightedBlock.
  replaceHTML(firstTokenElement, countToReplace) {
    let startingLine = firstTokenElement.parentElement;
  
    // Next, remove the token elements to be replaced.
    let toBeRemoved = firstTokenElement;
    let removedCount = 0;
    while (removedCount < countToReplace && toBeRemoved !== null) {
      let victim = toBeRemoved;
      toBeRemoved = toBeRemoved.nextSibling;
      victim.parentElement.removeChild(victim);
      ++removedCount;
    }
    let lineToRemove = startingLine.nextSibling;
    while (lineToRemove !== null && removedCount +
           lineToRemove.childElementCount <= countToReplace) {
      removedCount += lineToRemove.childElementCount;
      let victim = lineToRemove;
      lineToRemove = lineToRemove.nextSibling;
      victim.parentElement.removeChild(victim);
    }
    if (lineToRemove === null) {
      throw "Invalid arguments to .replaceHTML(): there were not" +
        countToReplace + "(=" + countToReplace + ") elements to replace";
    }
    toBeRemoved = lineToRemove.firstChild;
    while (removedCount < countToReplace && toBeRemoved !== null) {
      let victim = toBeRemoved;
      toBeRemoved = toBeRemoved.nextSibling;
      victim.parentElement.removeChild(victim);
      ++removedCount;
    }

    // Now, startingLine and lineToRemove should be adjacent lines, each
    //  containing only the remaining tokens (if any).
    const htmlToInsert = this.toHTML();
    if (htmlToInsert.length <= 1) {
      // If there are no lines to insert (or only 1), join the
      //  starting/ending lines of the removed section.
      let insertBeforeMe = lineToRemove.lastChild;
      for (let i = 0; i < lineToRemove.children.length; ++i) {
        let elementToMove = lineToRemove.children[i];
        lineToRemove.removeChild(elementToMove);
        startingLine.appendChild(elementToMove);
      }
      insertBeforeMe = insertBeforeMe.nextSibling;
      lineToRemove.parentElement.removeChild(lineToRemove);
      // Insert any applicable lines.
      if (htmlToInsert.length === 1) {
        startingLine.insertBefore(htmlToInsert[0], insertBeforeMe);
      }
    }
    else {
      // Otherwise, if there is more than 1 line to insert, insert the
      //  first line on startingLine, the last line on lineToRemove, and
      //  all the other lines in between.
      for (let i = 0; i < htmlToInsert[0].childElementCount; ++i) {
        let elementToMove = htmlToInsert[0].children[i];
        htmlToInsert[0].removeChild(elementToMove);
        startingLine.appendChild(elementToMove);
      }
      for (let i = 1; i < htmlToInsert.length - 1; ++i) {
        lineToRemove.parentElement.insertBefore(htmlToInsert[i], lineToRemove);
      }
      for (let i = 0;
           i < htmlToInsert[htmlToInsert.length - 1].childElementCount; ++i) {
        let elementToMove = htmlToInsert[htmlToInsert.length - 1].children[i];
        htmlToInsert[htmlToInsert.length - 1].removeChild(elementToMove);
        lineToRemove.insertBefore(elementToMove, lineToRemove.firstChild);
      }
    }
  }
};

// formatHighlighter(highlighter) - Converts the string properties of
//  highlighter into regular expressions if necessary.
// Note: Don't use the __formatted__ property in your highlighters, as it
//  will be overwritten.
const formatHighlighter = (highlighter) => {
  if (highlighter.__formatted__ !== highlighterFormattedKey) {
    for (let t of highlighter.tokenTypes) {
      t.regex = new RegExp(t.regex, "y");
    }
    for (let t of Object.values(highlighter.tokens)) {
      if (t.hasOwnProperty("breakOn")) {
        t.breakOn = new RegExp(t.breakOn, "y");
      }
      else if (t.hasOwnProperty("breakAfter")) {
        t.breakAfter = new RegExp(t.breakAfter, "y");
      }
    }
    highlighter.__formatted__ = highlighterFormattedKey;
  }
};

// rehighlightHTML(highlighter, code, element, index) - Rehighlights some
//  already-highlighted HTML using highlighter. The code is given by code, and
//  the root element is given by element. The index of the modified element
//  in the root element's child list is given by index.
const rehighlightHTML = (highlighter, code, element, index) => {
  const codeStream = new HighlightedStream(element);
  for (let i = 0; i < index; ++i) {
    if (!codeStream.hasNext) {
      throw "Invalid index passed to rehighlightHTML";
    }
    codeStream.next();
  }
  let firstElement;
  if (codeStream.hasNext) {
    firstElement = codeStream.peek()._element;
  }
  else {
    firstElement = null;
  }
  formatHighlighter(highlighter);
  let highlighted, done;
  const generator = generateHighlightedToken(
    highlighter, code, codeStream.peek().startIndex
  );
  const newTokens = [[]];
  while (({done, value: highlighted} = generator.next()) && !done) {
    while (codeStream.hasNext &&
           highlighted.data.startIndex > codeStream.peek().startIndex) {
      codeStream.next();
    } 
    if (codeStream.hasNext &&
      codeStream.peek().startIndex === highlighted.data.startIndex &&
      codeStream.peek().tokenTypeName === highlighted.data.tokenTypeName &&
      codeStream.peek().text === highlighted.text) {
      break;
    }
    if (highlighted.data.isContinuation) {
      newTokens.push([highlighted]);
    }
    else {
      newTokens[newTokens.length - 1].push(highlighted);
    }
  }
  if (done) {
    // If we ran out of tokens before iterating through all the old elements, we
    //  need to replace *all* of the elements.
    codeStream.invalidate();
  }
  // Now, replace the HTML elements that are no longer up-to-date
  let elementToRemove;
  if (codeStream.hasNext) {
    elementToRemove = codeStream.peek()._element.previousElementSibling;
    if (elementToRemove === null) {
      if (codeStream.peek()._element.parentNode.previousElementSibling ===
        undefined) {
        elementToRemove = firstElement;
      }
      else {
        elementToRemove = codeStream.peek()._element.parentNode.
          previousElementSibling.lastChild;
      }
    }
  }
  let victim;
  while (elementToRemove !== firstElement) {
    victim = elementToRemove;
    elementToRemove = elementToRemove.previousElementSibling;
    if (elementToRemove === null) {
      elementToRemove = victim.parentNode.previousElementSibling.
        lastElementChild;
    }
    if (victim.parentNode.children.length === 1) {
      victim.parentNode.parentNode.removeChild(victim.parentNode);
    }
    else {
      victim.parentNode.removeChild(victim);
    }
  }
  const newElements = newTokens.map(token => htmlFromArray(token));
  const elementToInsertBefore = elementToRemove.parentNode;
  let lineEl;
  for (let i = newElements.length - 1; i >= 0; --i) {
    if (i !== newElements.length - 1) {
      lineEl = document.createElement("span");
      lineEl.classList.add("line");
      for (let el of newElements[i]) {
        lineEl.appendChild(el);
      }
      element.insertBefore(lineEl, elementToInsertBefore);
    }
    else {
      for (let el of newElements[i]) {
        elementToInsertBefore.insertBefore(el, elementToRemove);
      }
    }
  }
  elementToRemove.parentNode.removeChild(elementToRemove);
};

// generateHighlightedToken(highlighter, code, startIndex = 0) - This generator
//  yields the next token as produced by highlighter with the code as given
//  in code. It starts at string index startIndex within code.
function* generateHighlightedToken(highlighter, code, startIndex = 0) {
  if (code.length - startIndex === 0) {
    return [];
  }

  let broken = true;
  let token = "";
  let tokenType = null;
  let tokenTypeName;
  let tokenStartIndex = startIndex;
  const tokenTypes = highlighter.tokenTypes;
  const tokens = highlighter.tokens;
  
  formatHighlighter(highlighter);

  for (let i = startIndex; i < code.length; i++) {
    if (broken) {
      broken = false;
      if (tokenType !== null) {
        const tokenLines = token.split("\n");
        for (let i = 0; i < tokenLines.length; ++i) {
          yield ({
            text: tokenLines[i] + (i === tokenLines.length - 1 ? "" : "\n"),
            className: tokenType.className,
            data: {
              isContinuation: i !== 0,
              tokenTypeName: tokenTypeName,
              startIndex: tokenStartIndex
            }
          });
          tokenStartIndex += tokenLines[i].length +
            (i !== tokenLines.length - 1);
        }
      }
      token = "";
      tokenType = null;
      tokenStartIndex = i;
      for (let j = 0; j < tokenTypes.length; j++) {
        if (tokenTypes[j].hasOwnProperty("from") &&
            tokenTypes[j].from.indexOf(tokenTypeName) === -1) {
          continue;
        }

        tokenTypes[j].regex.lastIndex = i;
        if (tokenTypes[j].regex.test(code)) {
          tokenTypeName = tokenTypes[j].name;
          if (!tokens.hasOwnProperty(tokenTypeName)) {
            throw "Invalid token type " + tokenType;
          }
          tokenType = tokens[tokenTypeName];
          break;
        }
      }
      if (tokenType === null) {
        tokenTypeName = "__default__";
        tokenType = defaultTokenType;
      }
      if (tokenType.hasOwnProperty("breakAfter")) {
        tokenType.breakAfter.lastIndex = i;
        if (tokenType.breakAfter.test(code)) {
          broken = true;
          while (i < tokenType.breakAfter.lastIndex) {
            token += code.charAt(i);
            i++;
          }
          i--;
        }
      }
    }
    else if (tokenType.hasOwnProperty("breakOn")) {
      tokenType.breakOn.lastIndex = i;
      if (tokenType.breakOn.test(code)) {
        i--;
        broken = true;
      }
    }
    else if (tokenType.hasOwnProperty("breakAfter")) {
      tokenType.breakAfter.lastIndex = i;
      if (tokenType.breakAfter.test(code)) {
        broken = true;
        while (i < tokenType.breakAfter.lastIndex) {
          token += code.charAt(i);
          i++;
        }
        i--;
      }
    }
    else {
      throw "No breaking regex for token type " + tokenTypeName;
    }
    if (!broken) {
      token += code.charAt(i);
    }
  }
  const tokenLines = token.split("\n");
  for (let i = 0; i < tokenLines.length; ++i) {
    yield ({
      text: tokenLines[i] + (i === tokenLines.length - 1 ? "" : "\n"),
      className: tokenType.className,
      isContinuation: i !== 0,
      data: {
        tokenTypeName: tokenTypeName,
        startIndex: tokenStartIndex
      }
    });
  }
}

// defaultToken(text) - Produces a default token containing the text in text.
const defaultToken = (text) => {
  return {
    className: "plain",
    text: text,
    data: {
      startIndex: 0,
      tokenTypeName: "__default__"
    }
  };
};

// highlightWith(highlighter, code) - Returns an array containing the token
//  objects resulting from highlighting code with highlighter.
const highlightWith = (highlighter, code) => {
  if (!code) {
    return [defaultToken("")];
  }
  const generator = generateHighlightedToken(highlighter, code);
  const result = [[]];
  for (let token of generator) {
    if (token.data.isContinuation) {
      result.push([]);
    }
    result[result.length - 1].push(token);
  }
  return result;
};

// highlight(code, language, element = null, index = null) - Produces
//  highlighted HTML for code written in language, starting with index
//  and being inserted into element if element is supplied or being returned
//  as a 2D array of tokens if element is not supplied.
const highlight = (code, language, element = null, index = null) => {
  try {
    if (highlighters.hasOwnProperty(language)) {
      const highlighterName = highlighters[language];
      let highlighter, fileContent;
      if (typeof highlighterName === "object") {
        // Highlighter is already loaded
        highlighter = highlighterName;
      }
      else {
        const fileContent = fs.readFileSync(path.join(__dirname,
          highlighterDirectory, highlighterName + ".json")).toString();
        highlighter = JSON.parse(fileContent);
        highlighters[language] = highlighter;
      }
      if (element !== null && index !== null) {
        return rehighlightHTML(highlighter, code, element, index);
      }
      return highlightWith(highlighter, code);
    }
  }
  catch (e) {
    // Return the default (plain text) rendering
    console.error("Error while highlighting: ", e);
  }
  return code.split("\n").map((line, i, arr) => defaultToken(line +
    (i === arr.length - 1 ? "" : "\n")));
};

module.exports = highlight;
