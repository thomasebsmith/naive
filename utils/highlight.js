// utils/highlight.js
//
// This file provides utilities for generating syntax-highlighted HTML based
//  on a mime type and some text.

// Imports
const fs = require("fs");
const path = require("path");
const { htmlFromArray, nthLayeredChild } = require("../utils/htmlUtilities");

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
  constructor(tokenType, className, text, startIndex, startsNewLine) {
    this.tokenType = tokenType;
    this.className = className;
    this.text = text;
    this.startIndex = startIndex;
    this.startsNewLine = startsNewLine;
  }
  equals(other) {
    return this.contentEquals(other) && this.startIndex === other.startIndex;
  }
  contentEquals(other) {
    return this.tokenType === other.tokenType &&
           this.text === other.text;
  }
  toHTML() {
    const element = document.createElement("span");
    element.classList.add(this.className);
    element.textContent = this.text;
    return element;
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
    let lineEl = document.createElement("span");
    lineEl.classList.add("line");
    let lines = [lineEl];
    let html;
    for (const token of this.tokens) {
      if (token.startsNewLine) {
        lineEl = document.createElement("span");
        lineEl.classList.add("line");
        lines.push(lineEl);
      }
      html = token.toHTML();
      lines[lines.length - 1].appendChild(html);
    }
    // If this block ends with a new line, add an empty line element to the
    //  end.
    if (this.tokens.length !== 0 &&
        this.tokens[this.tokens.length - 1].text.endsWith("\n")) {
      lineEl = document.createElement("span");
      lineEl.classList.add("line");
      lines.push(lineEl);
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
      if (this.tokens.length !== blockToCompare.tokens.length) {
        return [startIndex, this.tokens.length,
                startIndex, blockToCompare.tokens.length];
      }
      return null;
    }
    let endOffset = 0;
    while (this.tokens[this.tokens.length - endOffset - 1].contentEquals(
        blockToCompare.tokens[blockToCompare.tokens.length - endOffset - 1])) {
      if (endOffset === this.tokens.length - 1 ||
          endOffset === blockToCompare.tokens.length - 1) {
        break;
      }
      ++endOffset;
    }
    if (this.tokens.length - endOffset <= startIndex ||
        blockToCompare.tokens.length - endOffset <= startIndex) {
      endOffset = Math.min(this.tokens.length - startIndex - 1,
                           blockToCompare.tokens.length - startIndex - 1);
    }
    return [startIndex, this.tokens.length - endOffset,
            startIndex, blockToCompare.tokens.length - endOffset];
  }

  // firstTokenElement is the first element that overlaps with the given
  //  HighlightedBlock. It should be a *token* element, not a line element.
  // countToReplace is the number of HTML token elements that should be
  //  replaced (the elements are replaced with elements corresponding to *all*
  //  the elements in this HighlightedBlock).
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
    if (removedCount >= countToReplace && toBeRemoved !== null) {
      lineToRemove = document.createElement("span");
      lineToRemove.classList.add("line");
      startingLine.parentElement.insertBefore(lineToRemove,
        startingLine.nextSibling);
      while (toBeRemoved !== null) {
        let toMove = toBeRemoved;
        toBeRemoved = toBeRemoved.nextSibling;
        startingLine.removeChild(toMove);
        lineToRemove.appendChild(toMove);
      }
    }
    while (lineToRemove !== null && removedCount +
           lineToRemove.childElementCount <= countToReplace) {
      removedCount += lineToRemove.childElementCount;
      let victim = lineToRemove;
      lineToRemove = lineToRemove.nextSibling;
      victim.parentElement.removeChild(victim);
    }
    if (lineToRemove === null) {
      throw "Invalid arguments to .replaceHTML(): there were not " +
        countToReplace + " elements to replace";
    }
    toBeRemoved = lineToRemove.firstChild;
    while (removedCount < countToReplace) {
      let victim = toBeRemoved;
      toBeRemoved = toBeRemoved.nextSibling;
      victim.parentElement.removeChild(victim);
      ++removedCount;
    }

    // Now, startingLine and lineToRemove should be adjacent lines, each
    //  containing only the remaining tokens (if any).
    const htmlToInsert = this.toHTML();
    if (htmlToInsert.length > 0 && htmlToInsert[0].childElementCount === 0 &&
        startingLine.childElementCount === 0) {
      htmlToInsert.shift();
    }
    if (htmlToInsert.length <= 1) {
      // If there are no lines to insert (or only 1), join the
      //  starting/ending lines of the removed section.
      let insertBeforeMe = lineToRemove.firstChild;
      while (lineToRemove.childElementCount !== 0) {
        let elementToMove = lineToRemove.firstChild;
        lineToRemove.removeChild(elementToMove);
        startingLine.appendChild(elementToMove);
      }
      lineToRemove.parentElement.removeChild(lineToRemove);
      // Insert any applicable lines.
      if (htmlToInsert.length === 1) {
        while (htmlToInsert[0].childElementCount > 0) {
          let toMove = htmlToInsert[0].firstChild;
          htmlToInsert[0].removeChild(toMove);
          startingLine.insertBefore(toMove, insertBeforeMe);
        }
      }
    }
    else {
      // Otherwise, if there is more than 1 line to insert, insert the
      //  first line on startingLine, the last line on lineToRemove, and
      //  all the other lines in between.
      while (htmlToInsert[0].childElementCount > 0) {
        let elementToMove = htmlToInsert[0].firstChild;
        htmlToInsert[0].removeChild(elementToMove);
        startingLine.appendChild(elementToMove);
      }
      for (let i = 1; i < htmlToInsert.length - 1; ++i) {
        lineToRemove.parentElement.insertBefore(htmlToInsert[i], lineToRemove);
      }
      while (htmlToInsert[htmlToInsert.length - 1].childElementCount > 0) {
        let elementToMove = htmlToInsert[htmlToInsert.length - 1].lastChild;
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
const rehighlightHTML = (highlighter, oldBlock, newBlock, element) => {
  const changedRange = oldBlock.changedRange(newBlock);
  if (changedRange === null) {
    return newBlock;
  }
  const [startIndex, lastIndex, newStartIdx, newLastIdx] = changedRange;
  const firstTokenElement = nthLayeredChild(element, startIndex);
  const countToReplace = lastIndex - startIndex;
  const replaceWith = newBlock.slice(newStartIdx, newLastIdx);
  replaceWith.replaceHTML(firstTokenElement, countToReplace);
  return newBlock;
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
        for (let j = 0; j < tokenLines.length; ++j) {
          yield new HighlightedToken(
            tokenTypeName,
            tokenType.className,
            tokenLines[j] + (j === tokenLines.length - 1 ? "" : "\n"),
            tokenStartIndex,
            j !== 0
          );
          tokenStartIndex += tokenLines[j].length +
            (j !== tokenLines.length - 1);
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
  if (token.length !== 0) {
    const tokenLines = token.split("\n");
    for (let i = 0; i < tokenLines.length; ++i) {
      yield new HighlightedToken(
        tokenTypeName,
        tokenType.className,
        tokenLines[i] + (i === tokenLines.length - 1 ? "" : "\n"),
        tokenStartIndex,
        i !== 0
      );
      tokenStartIndex += tokenLines[i].length;
    }
  }
}

// defaultToken(text) - Produces a default token containing the text in text.
const defaultToken = (text) => {
  const tokens = text.split("\n").map((line, i, array) => {
    return new HighlightedToken(
      "__default__",
      "plain",
      line + (i === array.length - 1 ? "" : "\n"),
      0,
      i !== 0
    );
  });
  const block = new HighlightedBlock();
  for (const token of tokens) {
    block.appendToken(token);
  }
  return block;
};

// highlightWith(highlighter, code) - Returns an array containing the token
//  objects resulting from highlighting code with highlighter.
const highlightWith = (highlighter, code) => {
  if (!code) {
    return defaultToken("");
  }
  const generator = generateHighlightedToken(highlighter, code);
  const result = new HighlightedBlock();
  for (let token of generator) {
    result.appendToken(token);
  }
  return result;
};

// highlight(code, language, element = null, index = null) - Produces
//  highlighted HTML for code written in language, starting with index
//  and being inserted into element if element is supplied or being returned
//  as a 2D array of tokens if element is not supplied.
const highlight = (code, language, element = null, index = null,
                   oldBlock = null) => {
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
      if (element !== null && index !== null && oldBlock !== null) {
        // TODO: index is currently not used (could be used for efficiency)
        const newBlock = highlightWith(highlighter, code);
        return rehighlightHTML(highlighter, oldBlock, newBlock, element);
      }
      return highlightWith(highlighter, code);
    }
  }
  catch (e) {
    // Return the default (plain text) rendering
    console.error("Error while highlighting: ", e);
  }
  return defaultToken(code);
};

module.exports = highlight;
