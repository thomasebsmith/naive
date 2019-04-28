// utils/highlight.js
//
// This file provides utilities for generating syntax-highlighted HTML based
//  on a mime type and some text.

// Imports
const fs = require("fs");
const path = require("path");
const { htmlFromArray } = require("../utils/htmlUtilities");

const highlighterDirectory = "../highlighters/";

// Mime types
const highlighters = {
  "application/javascript": "javascript", "text/html": "html",
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
  let i = index;
  const elementList = element.children;
  formatHighlighter(highlighter);
  let highlighted, done;
  const generator = generateHighlightedToken(
    highlighter, code, +elementList[index].dataset.startIndex
  );
  const newTokens = [];
  while (({done, value: highlighted} = generator.next()) && !done) {
    while (i < elementList.length &&
           highlighted.data.startIndex > +elementList[i].dataset.startIndex) {
      i++;
    } 
    if (i < elementList.length &&
      +elementList[i].dataset.startIndex === highlighted.data.startIndex &&
      elementList[i].dataset.tokenTypeName === highlighted.data.tokenTypeName &&
      elementList[i].textContent === highlighted.text) {
      break;
    }
    newTokens.push(highlighted);
  }
  if (done) {
    // If we ran out of tokens before iterating through all the old elements, we
    //  need to replace *all* of the elements.
    i = elementList.length;
  }
  // Now, replace the HTML elements that are no longer up-to-date
  for (let j = i - 1; j >= index; j--) {
    element.removeChild(elementList[j]);
  }
  const newElements = htmlFromArray(newTokens);
  const elementToInsertBefore = index >= elementList.length ? null : elementList[index];
  for (let el of newElements) {
    element.insertBefore(el, elementToInsertBefore);
  }
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
        yield ({
          text: token,
          className: tokenType.className,
          data: {
            tokenTypeName: tokenTypeName,
            startIndex: tokenStartIndex
          }
        });
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
  yield ({
    text: token,
    className: tokenType.className,
    data: {
      tokenTypeName: tokenTypeName,
      startIndex: tokenStartIndex
    }
  });
}

// defaultToken(text) - Produces a default token containing the text in text.
const defaultToken = (text) => {
  return {
    className: "plain",
    text: code,
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
    return [defaultToken(code)];
  }
  const generator = generateHighlightedToken(highlighter, code);
  const result = [];
  for (let token of generator) {
    result.push(token);
  }
  return result;
};

// highlight(code, language, element = null, index = null) - Produces
//  highlighted HTML for code written in language, starting with index
//  and being inserted into element if element is supplied.
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
        const fileContent = fs.readFileSync(path.join(__dirname, highlighterDirectory, highlighterName + ".json")).toString();
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
  return [
    defaultToken(code)
  ];
};

module.exports = highlight;
