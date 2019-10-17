const highlight = require("./highlight");
const { nthLayeredChild } = require("./htmlUtilities");

class Identifier {
  constructor(token, element, index) {
    this.token = token;
    this.element = element;
    this.index = index;
  }
}

class EditingContext {
  constructor(document, tokenBlock, contentElement) {
    this.document = document;
    this.tokenBlock = tokenBlock;
    this.contentElement = contentElement;
  }
  tokenIndexOfPosition(position, options = {}) {
    if (position < 0) {
      // Assume that all "out-of-bounds" positions before the start of the code
      // fall in the first element.
      return 0;
    }
    let i;
    for (i = 0; i < this.tokenBlock.tokens.length; ++i) {
      let nextPosition = this.tokenBlock.tokens[i].startIndex;
      if (nextPosition > position) {
        return i - 1;
      }
    }
    return i - (!options.allowEndOfFile);
  }
  atPosition(position, options = {}) {
    const index = this.tokenIndexOfPosition(position, options);
    const element = nthLayeredChild(this.contentElement, index);
    let token = this.tokenBlock.tokens[index];
    if (!token) {
      // We must be at the end of the file, so generate a dummy token.
      token = new highlight.HighlightedToken(
        "--end-placeholder",
        "--end-placeholder",
        "\n",
        this.tokenBlock.tokens[index - 1].startIndex +
          this.tokenBlock.tokens[index - 1].text.length,
        false
      );
    }
    return new Identifier(token, element, index);
  }
  createElement(type, options = {}) {
    switch (type) {
      case "cursor":
        const el = this.document.createElement("span");
        el.classList.add("cursor");
        el.textContent = options.text || "";
        if (options.isFinalCharacter) {
          el.classList.add("final-character");
        }
        return el;
      default:
        return null;
    }
  }
}

module.exports.Identifier = Identifier;
module.exports.EditingContext = EditingContext;
