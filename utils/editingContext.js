const { nthLayeredChild } = require("./htmlUtilities");

class Identifier {
  constructor(token, element) {
    this.token = token;
    this.element = element;
  }
}

class EditingContext {
  constructor(document, tokenBlock) {
    this.document = document;
    this.tokenBlock = tokenBlock;
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
    return i - (!this.options.allowEndOfFile);
  }
  atPosition(position, options = {}) {
    const index = tokenIndexOfPosition(position, options);
    const token = this.tokenBlock.tokens[index];
    const element = nthLayeredChild(this.contentElement, index);
    return new Identifier(token, element);
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
