const fs = require("fs");
const path = require("path");
const { htmlFromArray } = require("../utils/htmlUtilities");

const highlighterDirectory = "../highlighters/";

const highlighters = {
  "application/javascript": "javascript",
  "text/plain": "text"
};

const highlighterFormattedKey = {};
const defaultTokenType = {
  breakOn: /[\s\S]/y,
  className: "plain"
};

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
    if (+elementList[i].dataset.startIndex === highlighted.data.startIndex &&
      elementList[i].dataset.tokenTypeName === highlighted.data.tokenTypeName) {
      break;
    }
    newTokens.push(highlighted);
    if (i >= elementList.length) {
      break;
    }
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

const highlightWith = (highlighter, code) => {
  if (!code) {
    return defaultToken(code);
  }
  const generator = generateHighlightedToken(highlighter, code);
  const result = [];
  for (let token of generator) {
    result.push(token);
  }
  return result;
};

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
