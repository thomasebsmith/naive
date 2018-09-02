const fs = require("fs");
const path = require("path");

const highlighterDirectory = "./highlighters/";

const highlighters = {
  "application/javascript": "javascript",
  "text/plain": "text"
};

const highlighterFormattedKey = {};
const defaultTokenType = {
  breakOn: /[\s\S]/y,
  className: "plain"
};

const highlightWith = (highlighter, code) => {
  let broken = true;
  let token = "";
  let tokenType = null;
  let tokenTypeName;
  const tokenTypes = highlighter.tokenTypes;
  const tokens = highlighter.tokens;
  const result = [];
  if (highlighter.__formatted__ !== highlighterFormattedKey) {
    for (let t of tokenTypes) {
      t.regex = new RegExp(t.regex, "y");
    }
    for (let t of Object.values(tokens)) {
      if (t.hasOwnProperty("breakOn")) {
        t.breakOn = new RegExp(t.breakOn, "y");
      }
      else if (t.hasOwnProperty("breakAfter")) {
        t.breakAfter = new RegExp(t.breakAfter, "y");
      }
    }
    highlighter.__formatted__ = highlighterFormattedKey;
  }
  for (let i = 0; i < code.length; i++) {
    if (broken) {
      broken = false;
      if (tokenType !== null) {
        result.push({
          text: token,
          className: tokenType.className
        });
      }
      token = "";
      tokenType = null;
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
    if (tokenType.hasOwnProperty("breakOn")) {
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
  result.push({
    text: token,
    className: tokenType.className
  });
  return result;
};

const highlight = (code, language) => {
  try {
    if (highlighters.hasOwnProperty(language)) {
      const highlighterName = highlighters[language];
      let highlighter, fileContent;
      if (typeof highlighterName === "object") {
        // Highlighter is already loaded
        highlighter = highlighterName;
      }
      else {
        const fileContent = fs.readFileSync(path.join(highlighterDirectory, highlighterName + ".json")).toString();
        highlighter = JSON.parse(fileContent);
        highlighters[language] = highlighter;
      }
      return highlightWith(highlighter, code);
    }
  }
  catch (e) {
    // Return the default (plain text) rendering
    console.error("Error while highlighting: ", e);
  }
  return [
    {
      className: "plain",
      text: code
    }
  ];
};

module.exports = highlight;
